import Foundation

/// How amounts are rendered throughout the app.
///
/// Budget Bestie lets you customise the currency symbol, where it sits, and the
/// separators, so formatting is a value the user owns rather than a locale
/// lookup. The digits are assembled by hand instead of via `NumberFormatter` so
/// that the output is identical on every platform the tests run on.
public struct CurrencyFormat: Hashable, Sendable, Codable {
    public enum SymbolPosition: String, Hashable, Sendable, Codable, CaseIterable {
        case leading
        case trailing
    }

    public var symbol: String
    public var position: SymbolPosition
    /// 2 for dollars-and-cents, 0 for whole-unit currencies such as yen.
    public var decimals: Int
    public var groupingSeparator: String
    public var decimalSeparator: String
    /// When true a negative amount reads `-$12.34`; when false, `($12.34)`.
    public var usesMinusSign: Bool

    public init(
        symbol: String = "$",
        position: SymbolPosition = .leading,
        decimals: Int = 2,
        groupingSeparator: String = ",",
        decimalSeparator: String = ".",
        usesMinusSign: Bool = true
    ) {
        self.symbol = symbol
        self.position = position
        self.decimals = decimals
        self.groupingSeparator = groupingSeparator
        self.decimalSeparator = decimalSeparator
        self.usesMinusSign = usesMinusSign
    }

    public static let usd = CurrencyFormat()

    /// `$1,234.56`. Set `showsSign` to force a leading `+` on positive amounts,
    /// which the transactions list uses to distinguish income from expenses.
    public func string(from money: Money, showsSign: Bool = false) -> String {
        let negative = money.minorUnits < 0
        let digits = absoluteDigits(from: money)
        let body = position == .leading ? symbol + digits : digits + symbol

        if negative {
            return usesMinusSign ? "-" + body : "(" + body + ")"
        }
        return showsSign && money.minorUnits > 0 ? "+" + body : body
    }

    /// The amount without its symbol, for the big keypad display that renders
    /// the symbol as a separate, smaller view.
    public func digitsOnly(from money: Money) -> String {
        (money.minorUnits < 0 ? "-" : "") + absoluteDigits(from: money)
    }

    private func absoluteDigits(from money: Money) -> String {
        let scale = Int(pow(10.0, Double(decimals)))
        let absolute = abs(money.minorUnits)
        // Money is always stored in hundredths; rescale when the currency shows
        // a different number of decimal places.
        let rescaled = decimals == 2 ? absolute : Int((Double(absolute) / 100 * Double(scale)).rounded())
        let whole = decimals == 0 ? rescaled : rescaled / scale
        let fraction = decimals == 0 ? 0 : rescaled % scale

        var result = grouped(String(whole))
        if decimals > 0 {
            var fractionText = String(fraction)
            while fractionText.count < decimals {
                fractionText = "0" + fractionText
            }
            result += decimalSeparator + fractionText
        }
        return result
    }

    private func grouped(_ digits: String) -> String {
        guard digits.count > 3, !groupingSeparator.isEmpty else { return digits }
        var characters = Array(digits)
        var index = characters.count - 3
        while index > 0 {
            characters.insert(contentsOf: groupingSeparator, at: index)
            index -= 3
        }
        return String(characters)
    }
}
