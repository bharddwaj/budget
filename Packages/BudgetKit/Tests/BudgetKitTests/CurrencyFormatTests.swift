import XCTest
@testable import BudgetKit

final class CurrencyFormatTests: XCTestCase {
    func testDefaultUSDFormatting() {
        let format = CurrencyFormat.usd
        XCTAssertEqual(format.string(from: Money(major: 0)), "$0.00")
        XCTAssertEqual(format.string(from: Money(major: 7.5)), "$7.50")
        XCTAssertEqual(format.string(from: Money(major: 1234.56)), "$1,234.56")
        XCTAssertEqual(format.string(from: Money(major: 1234567.89)), "$1,234,567.89")
    }

    func testNegativeAmounts() {
        XCTAssertEqual(CurrencyFormat.usd.string(from: Money(major: -12.3)), "-$12.30")

        let parenthesised = CurrencyFormat(usesMinusSign: false)
        XCTAssertEqual(parenthesised.string(from: Money(major: -12.3)), "($12.30)")
    }

    func testExplicitPositiveSign() {
        XCTAssertEqual(CurrencyFormat.usd.string(from: Money(major: 40), showsSign: true), "+$40.00")
        XCTAssertEqual(CurrencyFormat.usd.string(from: .zero, showsSign: true), "$0.00")
    }

    func testTrailingSymbolAndEuropeanSeparators() {
        let format = CurrencyFormat(
            symbol: " €",
            position: .trailing,
            groupingSeparator: ".",
            decimalSeparator: ","
        )
        XCTAssertEqual(format.string(from: Money(major: 1234.5)), "1.234,50 €")
    }

    func testZeroDecimalCurrency() {
        let yen = CurrencyFormat(symbol: "¥", decimals: 0)
        XCTAssertEqual(yen.string(from: Money(major: 1500)), "¥1,500")
    }

    func testDigitsOnlyOmitsSymbol() {
        XCTAssertEqual(CurrencyFormat.usd.digitsOnly(from: Money(major: 82.05)), "82.05")
    }
}
