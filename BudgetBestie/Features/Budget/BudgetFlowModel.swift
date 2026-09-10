import Foundation
import SwiftData
import BudgetKit

/// State for the four-screen budget flow.
///
/// The stuffing screen works in **target balances**, not top-ups: each envelope
/// shows what it will hold when the budget is done, starting from what it holds
/// now. That is what makes "remaining" reach exactly $0.00 — every dollar you
/// have is either sitting in an envelope already or waiting to be put in one.
@Observable
@MainActor
final class BudgetFlowModel {
    enum Step: Int, CaseIterable {
        case overview
        case schedule
        case allocate
        case review
    }

    private let store: BudgetStore
    private let engine: SuggestionEngine
    private let calendar: CycleCalendar

    var step: Step = .overview

    /// Total cash across all accounts, editable on the first screen so the user
    /// can reconcile against their real balances.
    var totalCash: Money
    var frequency: BudgetFrequency
    var startDate: Date
    var nextBudgetDate: Date

    /// Target balance per envelope, keyed by envelope id.
    var targets: [UUID: Money] = [:]
    /// Which envelope the stuffing screen is currently on.
    var allocationIndex: Int = 0

    private(set) var envelopes: [Envelope] = []
    private(set) var suggestions: [UUID: Suggestion] = [:]
    private(set) var previousCycle: BudgetCycle?
    private(set) var spentSinceLastBudget: Money = .zero
    private(set) var incomeSinceLastBudget: Money = .zero

    init(store: BudgetStore, now: Date = Date()) {
        self.store = store
        self.calendar = store.calendar
        self.engine = SuggestionEngine(calendar: store.calendar, format: store.settings().currencyFormat)

        let today = store.calendar.startOfDay(now)
        self.startDate = today

        let previous = store.activeCycle()
        self.previousCycle = previous
        self.frequency = previous?.frequency ?? .biweekly
        self.nextBudgetDate = store.calendar.nextBudgetDate(
            after: today,
            frequency: previous?.frequency ?? .biweekly
        )

        self.envelopes = store.envelopes()
        // What you actually have is what's in the envelopes right now, which the
        // user can correct on the first screen if their bank says otherwise.
        self.totalCash = envelopes.map(\.balance).total

        for envelope in envelopes {
            targets[envelope.id] = envelope.balance
        }

        self.suggestions = engine.suggestions(
            for: envelopes.map { $0.snapshot(asOf: today, calendar: store.calendar) },
            asOf: today,
            frequency: frequency
        )

        recalculateSinceLastBudget(now: now)
    }

    // MARK: - Derived

    var currentEnvelope: Envelope? {
        guard envelopes.indices.contains(allocationIndex) else { return nil }
        return envelopes[allocationIndex]
    }

    var allocatedTotal: Money {
        envelopes.map { targets[$0.id] ?? .zero }.total
    }

    /// What is left to place. The review step unlocks when this is zero.
    var remaining: Money {
        totalCash - allocatedTotal
    }

    var isFullyAllocated: Bool {
        remaining.isZero
    }

    /// The target balance offered by the `suggested` chip: what the envelope
    /// holds now plus the engine's recommended top-up.
    func suggestedTarget(for envelope: Envelope) -> Money {
        envelope.balance + (suggestions[envelope.id]?.amount ?? .zero)
    }

    func rationale(for envelope: Envelope) -> String? {
        suggestions[envelope.id]?.rationale
    }

    func target(for envelope: Envelope) -> Money {
        targets[envelope.id] ?? envelope.balance
    }

    /// How much this budget is adding to (or taking out of) an envelope.
    func delta(for envelope: Envelope) -> Money {
        target(for: envelope) - envelope.balance
    }

    func total(for kind: EnvelopeKind) -> Money {
        envelopes.filter { $0.kind == kind }.map { targets[$0.id] ?? .zero }.total
    }

    // MARK: - Navigation

    func advance() {
        guard let next = Step(rawValue: step.rawValue + 1) else { return }
        if next == .schedule {
            // Re-derive the schedule from whatever frequency is showing, so the
            // suggested next date is never stale.
            nextBudgetDate = calendar.nextBudgetDate(after: startDate, frequency: frequency)
        }
        if next == .allocate {
            refreshSuggestions()
            allocationIndex = 0
        }
        step = next
    }

    func goBack() {
        guard let previous = Step(rawValue: step.rawValue - 1) else { return }
        step = previous
    }

    /// Moves to the next envelope, or on to review once past the last one.
    func commitCurrentAndAdvance(target: Money) {
        guard let envelope = currentEnvelope else { return }
        targets[envelope.id] = target

        if allocationIndex < envelopes.count - 1 {
            allocationIndex += 1
        } else {
            step = .review
        }
    }

    /// Saves what's on the keypad and moves straight to another envelope, which
    /// is how the strip of emoji at the top of the stuffing screen works.
    func commitCurrent(_ target: Money, thenJumpTo index: Int) {
        if let envelope = currentEnvelope {
            targets[envelope.id] = target
        }
        guard envelopes.indices.contains(index) else { return }
        allocationIndex = index
        step = .allocate
    }

    /// Recomputes suggestions after the frequency changes, since every rule
    /// divides by the number of budgets left before a date.
    func refreshSuggestions() {
        suggestions = engine.suggestions(
            for: envelopes.map { $0.snapshot(asOf: startDate, calendar: calendar) },
            asOf: startDate,
            frequency: frequency
        )
    }

    func frequencyChanged() {
        nextBudgetDate = calendar.nextBudgetDate(after: startDate, frequency: frequency)
        refreshSuggestions()
    }

    // MARK: - Commit

    func createBudget() {
        let entries = envelopes.map { envelope in
            (
                envelope: envelope,
                amount: delta(for: envelope),
                suggested: suggestions[envelope.id]?.amount ?? .zero
            )
        }

        store.createBudget(
            startingBalance: totalCash,
            frequency: frequency,
            startDate: startDate,
            nextBudgetDate: nextBudgetDate,
            allocations: entries
        )
    }

    // MARK: - Helpers

    /// Fills the "you spent" and "you made" lines on the overview screen.
    private func recalculateSinceLastBudget(now: Date) {
        guard let previous = previousCycle else { return }
        let transactions = store.transactions(from: previous.startDate, to: now)
        spentSinceLastBudget = transactions
            .filter { $0.kind == .expense }
            .map(\.amount)
            .total
        incomeSinceLastBudget = transactions
            .filter { $0.kind == .income }
            .map(\.amount)
            .total
    }
}
