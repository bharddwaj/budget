import Foundation
import SwiftData
import BudgetKit

/// The single settings row for the app.
///
/// Stored in SwiftData rather than `UserDefaults` so that "delete all my data"
/// is one store wipe, with nothing left behind in a preferences file.
@Model
final class AppSettings {
    /// Fixed identifier so `fetchOrCreate` always finds the same row.
    var id: UUID = AppSettings.singletonID
    var hasOnboarded: Bool = false

    // Appearance
    var themeRaw: String = AppThemePreference.system.rawValue

    // Currency
    var currencySymbol: String = "$"
    var currencySymbolIsLeading: Bool = true
    var currencyDecimals: Int = 2
    var currencyGroupingSeparator: String = ","
    var currencyDecimalSeparator: String = "."

    // Security
    var faceIDEnabled: Bool = false

    // Reminders
    var dailyReminderEnabled: Bool = false
    var dailyReminderHour: Int = 20
    var dailyReminderMinute: Int = 0
    var budgetReminderEnabled: Bool = true
    var transactionReminderEnabled: Bool = false
    var billReminderEnabled: Bool = true
    /// How many days before a fixed bill's due date to nudge.
    var billReminderLeadDays: Int = 2

    /// The first day the spend-free calendar applies; days before it are blank.
    var noSpendTrackingStart: Date?

    init() {
        self.id = AppSettings.singletonID
    }

    static let singletonID = UUID(uuidString: "00000000-0000-0000-0000-0000000000B1")!

    // MARK: - Typed accessors

    var theme: AppThemePreference {
        get { AppThemePreference(rawValue: themeRaw) ?? .system }
        set { themeRaw = newValue.rawValue }
    }

    /// The formatter every amount in the app is rendered through.
    var currencyFormat: CurrencyFormat {
        get {
            CurrencyFormat(
                symbol: currencySymbol,
                position: currencySymbolIsLeading ? .leading : .trailing,
                decimals: currencyDecimals,
                groupingSeparator: currencyGroupingSeparator,
                decimalSeparator: currencyDecimalSeparator
            )
        }
        set {
            currencySymbol = newValue.symbol
            currencySymbolIsLeading = newValue.position == .leading
            currencyDecimals = newValue.decimals
            currencyGroupingSeparator = newValue.groupingSeparator
            currencyDecimalSeparator = newValue.decimalSeparator
        }
    }

    var dailyReminderTime: DateComponents {
        DateComponents(hour: dailyReminderHour, minute: dailyReminderMinute)
    }
}
