import Foundation
import BudgetKit

/// What a transaction did to an envelope.
///
/// Transfers are stored as a pair of rows sharing a `transferGroupID` rather
/// than as a relationship between two envelopes, which keeps every row a simple
/// signed movement and avoids an ambiguous inverse in SwiftData.
enum TransactionKind: String, Codable, CaseIterable, Identifiable {
    case expense
    case income
    case transferOut
    case transferIn
    /// Money placed into the envelope by a budget. Recorded so an envelope's
    /// history reads as one continuous ledger.
    case stuffing
    /// Money a budget took back out — what "empty" and a lowered target do.
    case unstuffing

    var id: String { rawValue }

    /// True when the amount reduces the envelope's balance.
    var isOutflow: Bool {
        switch self {
        case .expense, .transferOut, .unstuffing: return true
        case .income, .transferIn, .stuffing: return false
        }
    }

    /// Only real expenses can break a spend-free day; transfers and stuffing
    /// move money around without any of it leaving.
    var countsAsSpending: Bool {
        self == .expense
    }

    /// The two options offered on the add-transaction sheet. The rest are
    /// created by the app rather than picked by the user.
    static let userSelectable: [TransactionKind] = [.expense, .income]

    var title: String {
        switch self {
        case .expense: return "Expense"
        case .income: return "Income"
        case .transferOut: return "Transfer out"
        case .transferIn: return "Transfer in"
        case .stuffing: return "Stuffed"
        case .unstuffing: return "Unstuffed"
        }
    }

    var symbolName: String {
        switch self {
        case .expense: return "arrow.up.right"
        case .income: return "arrow.down.left"
        case .transferOut, .transferIn: return "arrow.left.arrow.right"
        case .stuffing: return "tray.and.arrow.down.fill"
        case .unstuffing: return "tray.and.arrow.up.fill"
        }
    }

    /// Applies the sign convention: outflows are negative when summed into a
    /// balance, everything else is positive.
    func signedAmount(_ amount: Money) -> Money {
        isOutflow ? -amount.magnitude : amount.magnitude
    }
}

/// How often a recurring expense or a fixed bill repeats.
enum RecurrenceRule: String, Codable, CaseIterable, Identifiable {
    case none
    case weekly
    case biweekly
    case monthly
    case quarterly
    case yearly

    var id: String { rawValue }

    var title: String {
        switch self {
        case .none: return "Doesn't repeat"
        case .weekly: return "Every week"
        case .biweekly: return "Every 2 weeks"
        case .monthly: return "Every month"
        case .quarterly: return "Every 3 months"
        case .yearly: return "Every year"
        }
    }

    /// The next occurrence after `date`, or nil when the rule does not repeat.
    func nextDate(after date: Date, calendar: Calendar = .current) -> Date? {
        switch self {
        case .none:
            return nil
        case .weekly:
            return calendar.date(byAdding: .day, value: 7, to: date)
        case .biweekly:
            return calendar.date(byAdding: .day, value: 14, to: date)
        case .monthly:
            return calendar.date(byAdding: .month, value: 1, to: date)
        case .quarterly:
            return calendar.date(byAdding: .month, value: 3, to: date)
        case .yearly:
            return calendar.date(byAdding: .year, value: 1, to: date)
        }
    }
}

/// The light/dark choice in settings.
enum AppThemePreference: String, Codable, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var title: String {
        switch self {
        case .system: return "Match my phone"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}
