import XCTest
@testable import BudgetKit

final class CycleCalendarTests: XCTestCase {
    private let calendar = CycleCalendar.utc

    func testWeeklyAndBiweeklyStepping() {
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 3, 5), frequency: .weekly),
            date(2026, 3, 12)
        )
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 3, 5), frequency: .biweekly),
            date(2026, 3, 19)
        )
    }

    func testMonthlySteppingClampsShortMonths() {
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 1, 15), frequency: .monthly),
            date(2026, 2, 15)
        )
        // 2026 is not a leap year, so the 31st pulls back to the 28th.
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 1, 31), frequency: .monthly),
            date(2026, 2, 28)
        )
    }

    func testSemimonthlyPairsHalvesOfTheMonthInsteadOfDrifting() {
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 3, 3), frequency: .semimonthly),
            date(2026, 3, 18)
        )
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 3, 18), frequency: .semimonthly),
            date(2026, 4, 3)
        )
        // Two steps must land back on the starting day of the next month.
        let first = calendar.nextBudgetDate(after: date(2026, 5, 10), frequency: .semimonthly)
        let second = calendar.nextBudgetDate(after: first, frequency: .semimonthly)
        XCTAssertEqual(second, date(2026, 6, 10))
    }

    func testSemimonthlyClampsIntoShortMonths() {
        // The 31st pairs with the 16th of the next month, not a 46th.
        XCTAssertEqual(
            calendar.nextBudgetDate(after: date(2026, 1, 31), frequency: .semimonthly),
            date(2026, 2, 16)
        )
    }

    func testBudgetDatesIncludeTheStartAndStopAtTheEnd() {
        let dates = calendar.budgetDates(
            startingAt: date(2026, 3, 1),
            frequency: .weekly,
            through: date(2026, 3, 22)
        )
        XCTAssertEqual(dates, [
            date(2026, 3, 1), date(2026, 3, 8), date(2026, 3, 15), date(2026, 3, 22)
        ])
    }

    func testBudgetsRemainingCountsTodaysBudget() {
        // Bill due 20 days out on a biweekly schedule: today, and the one in 14 days.
        XCTAssertEqual(
            calendar.budgetsRemaining(
                from: date(2026, 3, 1),
                until: date(2026, 3, 21),
                frequency: .biweekly
            ),
            2
        )
    }

    func testBillDueBeforeTheNextBudgetMustBeFundedInFull() {
        XCTAssertEqual(
            calendar.budgetsRemaining(
                from: date(2026, 3, 1),
                until: date(2026, 3, 4),
                frequency: .biweekly
            ),
            1
        )
    }

    func testOverdueTargetStillReturnsOne() {
        XCTAssertEqual(
            calendar.budgetsRemaining(
                from: date(2026, 3, 10),
                until: date(2026, 3, 1),
                frequency: .weekly
            ),
            1
        )
    }

    func testDaysBetween() {
        XCTAssertEqual(calendar.days(from: date(2026, 3, 1), to: date(2026, 3, 11)), 10)
        XCTAssertEqual(calendar.days(from: date(2026, 3, 11), to: date(2026, 3, 1)), -10)
    }

    func testApproximateCyclesInTrailingWindow() {
        XCTAssertEqual(calendar.approximateCycles(inDays: 90, frequency: .biweekly), 90.0 / 14)
        // Never returns less than one cycle, so an average is never inflated.
        XCTAssertEqual(calendar.approximateCycles(inDays: 3, frequency: .monthly), 1)
    }
}
