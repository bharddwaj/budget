import XCTest
@testable import BudgetKit

final class KeypadEngineTests: XCTestCase {
    private func type(_ keys: [KeypadKey], startingAt value: Money = .zero) -> KeypadEngine {
        var engine = KeypadEngine(value: value)
        for key in keys {
            engine.press(key)
        }
        return engine
    }

    func testDigitsFillInFromTheRight() {
        let engine = type([.digit(1), .digit(2), .digit(3)])
        XCTAssertEqual(engine.value, Money(major: 1.23))
    }

    func testFirstDigitReplacesTheIncomingBalance() {
        let engine = type([.digit(5)], startingAt: Money(major: 40))
        XCTAssertEqual(engine.value, Money(major: 0.05))
    }

    func testDoubleZero() {
        let engine = type([.digit(2), .doubleZero, .digit(0)])
        XCTAssertEqual(engine.value, Money(major: 20))
    }

    func testDeleteRemovesTheLastDigit() {
        let engine = type([.digit(1), .digit(2), .digit(3), .delete])
        XCTAssertEqual(engine.value, Money(major: 0.12))
    }

    func testDeleteOnAnUntouchedBalanceClearsIt() {
        let engine = type([.delete], startingAt: Money(major: 40))
        XCTAssertEqual(engine.value, .zero)
    }

    func testAddingToAnExistingBalance() {
        var engine = KeypadEngine(value: Money(major: 40))
        engine.press(.add)
        XCTAssertTrue(engine.hasPendingOperation)
        XCTAssertEqual(engine.value, .zero)

        engine.press(.digit(1))
        engine.press(.digit(0))
        engine.press(.doubleZero)
        XCTAssertEqual(engine.value, Money(major: 10))

        engine.press(.equals)
        XCTAssertEqual(engine.value, Money(major: 50))
        XCTAssertFalse(engine.hasPendingOperation)
    }

    func testSubtractingCanGoNegative() {
        var engine = KeypadEngine(value: Money(major: 10))
        engine.press(.subtract)
        engine.press(.digit(2))
        engine.press(.digit(0))
        engine.press(.doubleZero)
        engine.press(.equals)
        XCTAssertEqual(engine.value, Money(major: -10))
    }

    func testChainingOperatorsResolvesTheEarlierOne() {
        var engine = KeypadEngine(value: Money(major: 10))
        engine.press(.add)
        engine.press(.digit(5))
        engine.press(.digit(0))
        engine.press(.doubleZero)
        engine.press(.add)
        // The first + is settled the moment the second is pressed.
        XCTAssertEqual(engine.pendingValue, Money(major: 60))
    }

    func testSuggestedReplacesTheValueAndClearsAnyPendingMath() {
        var engine = KeypadEngine(value: Money(major: 10))
        engine.press(.add)
        engine.press(.suggested, suggested: Money(major: 87.5))
        XCTAssertEqual(engine.value, Money(major: 87.5))
        XCTAssertFalse(engine.hasPendingOperation)
    }

    func testEmptyZeroesTheEnvelope() {
        var engine = KeypadEngine(value: Money(major: 240))
        engine.press(.empty)
        XCTAssertEqual(engine.value, .zero)
    }

    func testCommitResolvesAHalfFinishedExpression() {
        var engine = KeypadEngine(value: Money(major: 40))
        engine.press(.add)
        engine.press(.digit(1))
        engine.press(.digit(0))
        engine.press(.doubleZero)
        XCTAssertEqual(engine.commit(), Money(major: 50))
    }

    func testResetClearsEverythingForTheNextEnvelope() {
        var engine = KeypadEngine(value: Money(major: 40))
        engine.press(.add)
        engine.press(.digit(9))
        engine.reset(to: Money(major: 12))
        XCTAssertEqual(engine.value, Money(major: 12))
        XCTAssertFalse(engine.hasPendingOperation)
        XCTAssertFalse(engine.isTyping)
    }

    func testEntryIsCapped() {
        var engine = KeypadEngine()
        for _ in 0..<20 {
            engine.press(.digit(9))
        }
        XCTAssertLessThanOrEqual(engine.value.minorUnits, KeypadEngine.maximumMinorUnits)
    }
}
