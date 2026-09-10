import XCTest
@testable import BudgetKit

final class NoSpendEvaluatorTests: XCTestCase {
    private let evaluator = NoSpendEvaluator(calendar: .utc)
    private let groceries = UUID()
    private let rent = UUID()

    private func statuses(
        events: [SpendEvent],
        offLimits: Set<UUID>,
        trackingStart: Date? = date(2026, 3, 1),
        today: Date = date(2026, 3, 5)
    ) -> [Date: SpendFreeStatus] {
        evaluator.statuses(
            from: date(2026, 3, 1),
            to: date(2026, 3, 7),
            events: events,
            offLimitsEnvelopeIDs: offLimits,
            trackingStart: trackingStart,
            today: today
        )
    }

    func testSpendingFromAnOffLimitsEnvelopeTurnsTheDayRed() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 3), envelopeID: groceries, isExpense: true)],
            offLimits: [groceries]
        )
        XCTAssertEqual(result[date(2026, 3, 3)], .spent)
        XCTAssertEqual(result[date(2026, 3, 2)], .spendFree)
    }

    func testSpendingFromAnAllowedEnvelopeLeavesTheDayGreen() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 3), envelopeID: rent, isExpense: true)],
            offLimits: [groceries]
        )
        XCTAssertEqual(result[date(2026, 3, 3)], .spendFree)
    }

    func testIncomeAndTransfersNeverBreakADay() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 3), envelopeID: groceries, isExpense: false)],
            offLimits: [groceries]
        )
        XCTAssertEqual(result[date(2026, 3, 3)], .spendFree)
    }

    func testFutureDaysAreUpcomingAndPreTrackingDaysAreUntracked() {
        let result = evaluator.statuses(
            from: date(2026, 2, 25),
            to: date(2026, 3, 7),
            events: [],
            offLimitsEnvelopeIDs: [groceries],
            trackingStart: date(2026, 3, 1),
            today: date(2026, 3, 5)
        )
        XCTAssertEqual(result[date(2026, 2, 26)], .untracked)
        XCTAssertEqual(result[date(2026, 3, 5)], .spendFree)
        XCTAssertEqual(result[date(2026, 3, 6)], .upcoming)
    }

    func testStreakCountsBackFromToday() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 2), envelopeID: groceries, isExpense: true)],
            offLimits: [groceries]
        )
        // 3rd, 4th and 5th are clean; the 2nd broke it.
        XCTAssertEqual(evaluator.currentStreak(statuses: result, today: date(2026, 3, 5)), 3)
    }

    func testStreakFallsBackToYesterdayWhenTodayIsAlreadyBroken() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 5), envelopeID: groceries, isExpense: true)],
            offLimits: [groceries]
        )
        XCTAssertEqual(evaluator.currentStreak(statuses: result, today: date(2026, 3, 5)), 4)
    }

    func testSpendFreeCount() {
        let result = statuses(
            events: [SpendEvent(date: date(2026, 3, 4), envelopeID: groceries, isExpense: true)],
            offLimits: [groceries]
        )
        // 1st through 5th are tracked, one of them red.
        XCTAssertEqual(evaluator.spendFreeCount(statuses: result), 4)
    }
}
