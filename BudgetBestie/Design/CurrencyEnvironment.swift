import SwiftUI
import BudgetKit

/// The user's chosen currency formatting, handed down the view tree so no view
/// has to reach into settings to render an amount.
private struct CurrencyFormatKey: EnvironmentKey {
    static let defaultValue: CurrencyFormat = .usd
}

extension EnvironmentValues {
    var currencyFormat: CurrencyFormat {
        get { self[CurrencyFormatKey.self] }
        set { self[CurrencyFormatKey.self] = newValue }
    }
}
