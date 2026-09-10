import XCTest
@testable import BudgetKit

final class SuggestionEngineTests: XCTestCase {
    private let engine = SuggestionEngine(calendar: .utc, format: .usd)
    private let today = date(2026, 3, 1)

    // MARK: - Variable

    func testVariableSuggestionIsTheTrailingAverageProRatedToOneCycle() {
        let envelope = EnvelopeSnapshot(
            kind: .variable,
            trailingSpend: Money(major: 600),
            trailingWindowDays: 90
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .biweekly)
        // $600 over 90 days is 90/14 ≈ 6.43 biweekly budgets.
        XCTAssertEqual(suggestion.amount, Money(minorUnits: 9333))
    }

    func testVariableSuggestionTopsUpRatherThanRestuffingARollover() {
        let envelope = EnvelopeSnapshot(
            kind: .variable,
            currentBalance: Money(major: 50),
            trailingSpend: Money(major: 600),
            trailingWindowDays: 90
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .monthly)
        // $600 over 90 days is 90/(365/12) ≈ 2.96 monthly budgets, so about
        // $202.78 a cycle — less the $50 already sitting there.
        XCTAssertEqual(suggestion.amount, Money(minorUnits: 20278 - 5000))
    }

    func testVariableSuggestionNeverGoesNegative() {
        let envelope = EnvelopeSnapshot(
            kind: .variable,
            currentBalance: Money(major: 5000),
            trailingSpend: Money(major: 600)
        )
        XCTAssertEqual(
            engine.suggestion(for: envelope, asOf: today, frequency: .monthly).amount,
            .zero
        )
    }

    func testVariableWithNoHistoryReturnsZeroAndSaysSo() {
        let envelope = EnvelopeSnapshot(kind: .variable)
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .weekly)
        XCTAssertEqual(suggestion.amount, .zero)
        XCTAssertTrue(suggestion.rationale.contains("No spending here yet"))
    }

    // MARK: - Fixed

    func testFixedSuggestionSplitsTheBillAcrossRemainingBudgets() {
        let envelope = EnvelopeSnapshot(
            kind: .fixed,
            billAmount: Money(major: 1200),
            billDueDate: date(2026, 3, 21)
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .biweekly)
        XCTAssertEqual(suggestion.amount, Money(major: 600))
        XCTAssertTrue(suggestion.rationale.contains("2 budgets"))
    }

    func testFixedSuggestionSubtractsWhatIsAlreadyStuffed() {
        let envelope = EnvelopeSnapshot(
            kind: .fixed,
            currentBalance: Money(major: 400),
            billAmount: Money(major: 1200),
            billDueDate: date(2026, 3, 21)
        )
        XCTAssertEqual(
            engine.suggestion(for: envelope, asOf: today, frequency: .biweekly).amount,
            Money(major: 400)
        )
    }

    func testFixedBillDueBeforeNextBudgetIsCoveredInFull() {
        let envelope = EnvelopeSnapshot(
            kind: .fixed,
            billAmount: Money(major: 1200),
            billDueDate: date(2026, 3, 4)
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .biweekly)
        XCTAssertEqual(suggestion.amount, Money(major: 1200))
        XCTAssertTrue(suggestion.rationale.contains("last budget"))
    }

    func testFixedWithoutABillAmountReturnsZero() {
        let envelope = EnvelopeSnapshot(kind: .fixed)
        XCTAssertEqual(
            engine.suggestion(for: envelope, asOf: today, frequency: .weekly).amount,
            .zero
        )
    }

    // MARK: - Savings

    func testSavingsSuggestionPacesTowardTheDeadline() {
        let envelope = EnvelopeSnapshot(
            kind: .savings,
            currentBalance: Money(major: 200),
            goalAmount: Money(major: 1000),
            goalDeadline: date(2026, 3, 29)
        )
        // Weekly budgets on 1, 8, 15, 22, 29 — five of them for the $800 left.
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .weekly)
        XCTAssertEqual(suggestion.amount, Money(major: 160))
    }

    func testSavingsWithoutADeadlineSuggestsNothingButReportsProgress() {
        let envelope = EnvelopeSnapshot(
            kind: .savings,
            currentBalance: Money(major: 200),
            goalAmount: Money(major: 1000)
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .weekly)
        XCTAssertEqual(suggestion.amount, .zero)
        XCTAssertTrue(suggestion.rationale.contains("$800.00 to go"))
    }

    func testReachedGoalSuggestsNothing() {
        let envelope = EnvelopeSnapshot(
            kind: .savings,
            currentBalance: Money(major: 1000),
            goalAmount: Money(major: 1000),
            goalDeadline: date(2026, 6, 1)
        )
        let suggestion = engine.suggestion(for: envelope, asOf: today, frequency: .weekly)
        XCTAssertEqual(suggestion.amount, .zero)
        XCTAssertTrue(suggestion.rationale.contains("Goal reached"))
    }

    // MARK: - Batch

    func testSuggestionsForManyEnvelopesAreKeyedByID() {
        let variable = EnvelopeSnapshot(kind: .variable, trailingSpend: Money(major: 300))
        let fixed = EnvelopeSnapshot(
            kind: .fixed,
            billAmount: Money(major: 100),
            billDueDate: date(2026, 3, 15)
        )
        let result = engine.suggestions(for: [variable, fixed], asOf: today, frequency: .weekly)
        XCTAssertEqual(result.count, 2)
        XCTAssertNotNil(result[variable.id])
        XCTAssertNotNil(result[fixed.id])
    }
}
