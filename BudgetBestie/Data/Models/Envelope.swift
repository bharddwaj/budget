import Foundation
import SwiftData
import BudgetKit

/// One digital envelope: a named pot of money with a stuffing method.
///
/// Amounts are persisted as `Int` minor units and enums as their raw strings,
/// because those are the types SwiftData predicates can filter and sort on. The
/// typed `Money` / `EnvelopeKind` values are exposed as computed properties, and
/// the rest of the app only ever touches those.
@Model
final class Envelope {
    var id: UUID = UUID()
    var emoji: String = "💸"
    var name: String = ""
    var kindRaw: String = EnvelopeKind.variable.rawValue
    /// Position within its type group on the home screen; drag-to-reorder writes here.
    var sortIndex: Int = 0
    var balanceMinorUnits: Int = 0
    /// Retired envelopes stay in history but drop out of stuffing and pickers.
    var isRetired: Bool = false
    /// When true, spending here breaks a spend-free day.
    var isOffLimitsForNoSpend: Bool = true
    var createdAt: Date = Date()

    // MARK: - Fixed envelope details

    var billAmountMinorUnits: Int?
    var billDueDate: Date?
    var billRecurrenceRaw: String?
    /// Set when the bill is paid, so the unpaid-bill reminder stops nagging.
    var lastPaidOn: Date?

    // MARK: - Savings envelope details

    var goalAmountMinorUnits: Int?
    var goalDeadline: Date?

    @Relationship(deleteRule: .cascade, inverse: \Transaction.envelope)
    var transactions: [Transaction] = []

    @Relationship(deleteRule: .cascade, inverse: \Allocation.envelope)
    var allocations: [Allocation] = []

    init(
        emoji: String,
        name: String,
        kind: EnvelopeKind,
        sortIndex: Int = 0,
        balance: Money = .zero
    ) {
        self.id = UUID()
        self.emoji = emoji
        self.name = name
        self.kindRaw = kind.rawValue
        self.sortIndex = sortIndex
        self.balanceMinorUnits = balance.minorUnits
        self.createdAt = Date()
        self.isOffLimitsForNoSpend = !kind.isSpendFreeByDefault
    }

    // MARK: - Typed accessors

    var kind: EnvelopeKind {
        get { EnvelopeKind(rawValue: kindRaw) ?? .variable }
        set { kindRaw = newValue.rawValue }
    }

    var balance: Money {
        get { Money(minorUnits: balanceMinorUnits) }
        set { balanceMinorUnits = newValue.minorUnits }
    }

    var billAmount: Money? {
        get { billAmountMinorUnits.map(Money.init(minorUnits:)) }
        set { billAmountMinorUnits = newValue?.minorUnits }
    }

    var goalAmount: Money? {
        get { goalAmountMinorUnits.map(Money.init(minorUnits:)) }
        set { goalAmountMinorUnits = newValue?.minorUnits }
    }

    var billRecurrence: RecurrenceRule {
        get { billRecurrenceRaw.flatMap(RecurrenceRule.init(rawValue:)) ?? .monthly }
        set { billRecurrenceRaw = newValue.rawValue }
    }

    // MARK: - Derived

    /// How much has been stuffed into this envelope in the active cycle.
    func stuffed(in cycle: BudgetCycle?) -> Money {
        guard let cycle else { return .zero }
        return allocations
            .filter { $0.cycle?.id == cycle.id }
            .map(\.amount)
            .total
    }

    /// Spending against this envelope since `date`, used by the row's progress
    /// bar and by the trailing average behind suggestions.
    func spent(since date: Date, now: Date = Date()) -> Money {
        transactions
            .filter { $0.kind == .expense && $0.date >= date && $0.date <= now }
            .map(\.amount)
            .total
    }

    /// 0...1 for the row's progress bar: how much of what was stuffed is gone.
    func spentFraction(in cycle: BudgetCycle?) -> Double {
        let stuffedAmount = stuffed(in: cycle)
        guard stuffedAmount.isPositive else { return balance.isPositive ? 0 : 1 }
        let spentAmount = (stuffedAmount - balance).clampedToZero
        return spentAmount.doubleValue / stuffedAmount.doubleValue
    }

    /// Progress toward a savings goal, or nil for other envelope types.
    var goalProgress: Double? {
        guard kind == .savings, let goal = goalAmount, goal.isPositive else { return nil }
        return min(1, balance.doubleValue / goal.doubleValue)
    }

    /// True when a fixed bill is due and has not been paid this cycle.
    func isBillOutstanding(asOf date: Date = Date()) -> Bool {
        guard kind == .fixed, let due = billDueDate else { return false }
        guard let paid = lastPaidOn else { return due <= date }
        return paid < due && due <= date
    }

    /// The snapshot the suggestion engine works from.
    func snapshot(asOf date: Date, calendar: CycleCalendar) -> EnvelopeSnapshot {
        let windowStart = calendar.calendar.date(
            byAdding: .day,
            value: -SuggestionEngine.trailingWindowDays,
            to: date
        ) ?? date

        return EnvelopeSnapshot(
            id: id,
            kind: kind,
            currentBalance: balance,
            billAmount: billAmount,
            billDueDate: billDueDate,
            goalAmount: goalAmount,
            goalDeadline: goalDeadline,
            trailingSpend: spent(since: windowStart, now: date),
            trailingWindowDays: SuggestionEngine.trailingWindowDays
        )
    }
}
