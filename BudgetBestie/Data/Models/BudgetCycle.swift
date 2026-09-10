import Foundation
import SwiftData
import BudgetKit

/// One run of the budget: the money you had, when the next one lands, and where
/// it all went.
///
/// Exactly one cycle is active at a time. Creating a new budget closes the
/// current cycle and opens the next, which is what makes "spending since your
/// last budget" answerable on the overview screen.
@Model
final class BudgetCycle {
    var id: UUID = UUID()
    /// The day this budget was created — its "budget day".
    var startDate: Date = Date()
    /// When the next budget is due, driving the home-screen banner and reminder.
    var nextBudgetDate: Date = Date()
    var frequencyRaw: String = BudgetFrequency.biweekly.rawValue
    /// Total cash on hand when this budget was run, after reconciling.
    var startingBalanceMinorUnits: Int = 0
    var isActive: Bool = true
    var closedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \Allocation.cycle)
    var allocations: [Allocation] = []

    init(
        startDate: Date,
        nextBudgetDate: Date,
        frequency: BudgetFrequency,
        startingBalance: Money
    ) {
        self.id = UUID()
        self.startDate = startDate
        self.nextBudgetDate = nextBudgetDate
        self.frequencyRaw = frequency.rawValue
        self.startingBalanceMinorUnits = startingBalance.minorUnits
        self.isActive = true
    }

    // MARK: - Typed accessors

    var frequency: BudgetFrequency {
        get { BudgetFrequency(rawValue: frequencyRaw) ?? .biweekly }
        set { frequencyRaw = newValue.rawValue }
    }

    var startingBalance: Money {
        get { Money(minorUnits: startingBalanceMinorUnits) }
        set { startingBalanceMinorUnits = newValue.minorUnits }
    }

    // MARK: - Derived

    /// Everything this budget put into envelopes.
    var totalAllocated: Money {
        allocations.map(\.amount).total
    }

    /// What was left over after stuffing. Should be zero on a finished budget.
    var unallocated: Money {
        startingBalance - totalAllocated
    }

    func totalAllocated(to kind: EnvelopeKind) -> Money {
        allocations
            .filter { $0.envelope?.kind == kind }
            .map(\.amount)
            .total
    }

    /// True once the next budget date has arrived, which raises the
    /// "time to budget" banner on the home screen.
    func isBudgetDue(asOf date: Date = Date(), calendar: CycleCalendar = CycleCalendar()) -> Bool {
        calendar.startOfDay(date) >= calendar.startOfDay(nextBudgetDate)
    }

    /// Days until the next budget; negative once it is overdue.
    func daysUntilNextBudget(asOf date: Date = Date(), calendar: CycleCalendar = CycleCalendar()) -> Int {
        calendar.days(from: date, to: nextBudgetDate)
    }
}
