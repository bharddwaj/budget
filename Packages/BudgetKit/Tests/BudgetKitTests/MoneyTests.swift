import XCTest
@testable import BudgetKit

final class MoneyTests: XCTestCase {
    func testMajorInitRoundsHalfAwayFromZero() {
        XCTAssertEqual(Money(major: 12.34).minorUnits, 1234)
        XCTAssertEqual(Money(major: 0.005).minorUnits, 1)
        XCTAssertEqual(Money(major: -0.005).minorUnits, -1)
    }

    func testArithmetic() {
        XCTAssertEqual(Money(major: 10) + Money(major: 2.5), Money(major: 12.5))
        XCTAssertEqual(Money(major: 10) - Money(major: 12.5), Money(major: -2.5))
        XCTAssertEqual(Money(major: 10) * 3, Money(major: 30))
    }

    func testDivisionRoundsToNearestCentAndToleratesZero() {
        XCTAssertEqual(Money(minorUnits: 1000) / 3, Money(minorUnits: 333))
        XCTAssertEqual(Money(minorUnits: 1001) / 2, Money(minorUnits: 501))
        XCTAssertEqual(Money(minorUnits: 1000) / 0, .zero)
        XCTAssertEqual(Money(minorUnits: 1000) / -4, .zero)
    }

    func testSplitAlwaysSumsBackToTheOriginal() {
        for parts in 1...9 {
            let pieces = Money(minorUnits: 1000).split(into: parts)
            XCTAssertEqual(pieces.count, parts)
            XCTAssertEqual(pieces.total, Money(minorUnits: 1000))
        }
    }

    func testSplitOfNegativeAmountSumsBack() {
        let pieces = Money(minorUnits: -1000).split(into: 3)
        XCTAssertEqual(pieces.total, Money(minorUnits: -1000))
    }

    func testClampedToZero() {
        XCTAssertEqual(Money(major: -5).clampedToZero, .zero)
        XCTAssertEqual(Money(major: 5).clampedToZero, Money(major: 5))
    }
}
