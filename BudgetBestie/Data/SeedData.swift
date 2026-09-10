import Foundation
import SwiftData
import BudgetKit

/// A realistic budget used by SwiftUI previews and by the "load sample data"
/// action in settings.
///
/// The history is generated from a fixed seed rather than `Int.random`, so
/// previews and screenshots look the same every time and the suggestion engine
/// has stable three-month averages to work from.
enum SeedData {

    @MainActor
    static func populate(context: ModelContext, now: Date = Date()) {
        let store = BudgetStore(context: context)
        let calendar = store.calendar

        let settings = store.settings()
        settings.hasOnboarded = true
        settings.noSpendTrackingStart = calendar.calendar.date(byAdding: .day, value: -90, to: now)

        var generator = SeededGenerator(seed: 20260301)

        // MARK: Envelopes

        let variable = [
            ("🛒", "Groceries", 42000),
            ("⛽️", "Gas", 16000),
            ("🍜", "Eating out", 12000),
            ("🎀", "Fun money", 9000)
        ]
        let fixed = [
            ("🏠", "Rent", 180000, 1),
            ("📱", "Phone", 7500, 12),
            ("🚗", "Car insurance", 14200, 20),
            ("💡", "Utilities", 11000, 8)
        ]
        let savings = [
            ("🛟", "Emergency fund", 500000, 300),
            ("✈️", "Iceland trip", 240000, 180),
            ("🎄", "Christmas", 90000, 120)
        ]

        var envelopes: [Envelope] = []

        for (index, entry) in variable.enumerated() {
            let envelope = Envelope(
                emoji: entry.0,
                name: entry.1,
                kind: .variable,
                sortIndex: index,
                balance: Money(minorUnits: entry.2)
            )
            context.insert(envelope)
            envelopes.append(envelope)
        }

        for (index, entry) in fixed.enumerated() {
            let envelope = Envelope(
                emoji: entry.0,
                name: entry.1,
                kind: .fixed,
                sortIndex: index,
                balance: Money(minorUnits: entry.2 / 2)
            )
            envelope.billAmount = Money(minorUnits: entry.2)
            envelope.billDueDate = nextDay(entry.3, onOrAfter: now, calendar: calendar.calendar)
            envelope.billRecurrence = .monthly
            context.insert(envelope)
            envelopes.append(envelope)
        }

        for (index, entry) in savings.enumerated() {
            let envelope = Envelope(
                emoji: entry.0,
                name: entry.1,
                kind: .savings,
                sortIndex: index,
                balance: Money(minorUnits: entry.2 / 4)
            )
            envelope.goalAmount = Money(minorUnits: entry.2)
            envelope.goalDeadline = calendar.calendar.date(byAdding: .day, value: entry.3, to: now)
            context.insert(envelope)
            envelopes.append(envelope)
        }

        let spendable = envelopes.filter { $0.kind == .variable }

        // MARK: Three months of spending

        for dayOffset in stride(from: 90, through: 1, by: -1) {
            guard let day = calendar.calendar.date(byAdding: .day, value: -dayOffset, to: now) else {
                continue
            }
            // Roughly two spend-free days a week, so the calendar has both colours.
            guard generator.next(upTo: 10) > 2 else { continue }

            let count = generator.next(upTo: 3) + 1
            for _ in 0..<count {
                let envelope = spendable[generator.next(upTo: spendable.count)]
                let amount = Money(minorUnits: (generator.next(upTo: 60) + 5) * 100)
                let note = descriptions[envelope.name]?.randomElement(using: &generator) ?? ""
                let transaction = Transaction(
                    amount: amount,
                    kind: .expense,
                    note: note,
                    date: day,
                    envelope: envelope
                )
                context.insert(transaction)
            }
        }

        // MARK: An active budget

        let startDate = calendar.calendar.date(byAdding: .day, value: -6, to: now) ?? now
        let nextDate = calendar.nextBudgetDate(after: startDate, frequency: .biweekly)
        let cycle = BudgetCycle(
            startDate: startDate,
            nextBudgetDate: nextDate,
            frequency: .biweekly,
            startingBalance: Money(major: 2400)
        )
        context.insert(cycle)

        let engine = SuggestionEngine(calendar: calendar, format: settings.currencyFormat)
        for envelope in envelopes {
            let suggestion = engine.suggestion(
                for: envelope.snapshot(asOf: startDate, calendar: calendar),
                asOf: startDate,
                frequency: .biweekly
            )
            let allocation = Allocation(
                amount: envelope.balance,
                suggested: suggestion.amount,
                envelope: envelope,
                cycle: cycle,
                createdAt: startDate
            )
            context.insert(allocation)
        }

        store.save()
    }

    /// Removes every record, backing "start fresh" and "delete all my data".
    @MainActor
    static func wipe(context: ModelContext) {
        try? context.delete(model: Transaction.self)
        try? context.delete(model: Allocation.self)
        try? context.delete(model: BudgetCycle.self)
        try? context.delete(model: Envelope.self)
        try? context.delete(model: AppSettings.self)
        try? context.save()
    }

    // MARK: - Helpers

    /// The next occurrence of a day-of-month, used to place bill due dates just
    /// ahead of "now" so the upcoming-bills list is never empty.
    private static func nextDay(_ day: Int, onOrAfter date: Date, calendar: Calendar) -> Date {
        var components = calendar.dateComponents([.year, .month], from: date)
        components.day = day
        let thisMonth = calendar.date(from: components) ?? date
        if thisMonth >= calendar.startOfDay(for: date) { return thisMonth }
        return calendar.date(byAdding: .month, value: 1, to: thisMonth) ?? thisMonth
    }

    private static let descriptions: [String: [String]] = [
        "Groceries": ["Trader Joe's", "Corner market", "Costco run", "Produce"],
        "Gas": ["Shell", "Fill up", "Costco gas"],
        "Eating out": ["Coffee", "Lunch with Ava", "Ramen", "Takeout"],
        "Fun money": ["Bookshop", "Nail appointment", "Movie", "Candle"]
    ]
}

/// A tiny deterministic generator so sample data never shifts between runs.
struct SeededGenerator: RandomNumberGenerator {
    private var state: UInt64

    init(seed: UInt64) {
        // Any non-zero start works; xorshift is degenerate at zero.
        self.state = seed == 0 ? 0x9E3779B97F4A7C15 : seed
    }

    mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }

    /// A value in `0..<bound`, or 0 when the bound is empty.
    mutating func next(upTo bound: Int) -> Int {
        guard bound > 0 else { return 0 }
        return Int(next() % UInt64(bound))
    }
}
