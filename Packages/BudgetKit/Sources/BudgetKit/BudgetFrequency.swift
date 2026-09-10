import Foundation

/// How often a budget is run, matching the four options on the schedule screen:
/// "every week, every second week, twice a month, or once a month".
public enum BudgetFrequency: String, Hashable, Sendable, Codable, CaseIterable, Identifiable {
    case weekly
    case biweekly
    case semimonthly
    case monthly

    public var id: String { rawValue }

    /// The label shown on the schedule screen's option rows.
    public var title: String {
        switch self {
        case .weekly: return "Every week"
        case .biweekly: return "Every second week"
        case .semimonthly: return "Twice a month"
        case .monthly: return "Once a month"
        }
    }

    /// Short form for banners and summaries, e.g. "budgeting weekly".
    public var adverb: String {
        switch self {
        case .weekly: return "weekly"
        case .biweekly: return "every 2 weeks"
        case .semimonthly: return "twice a month"
        case .monthly: return "monthly"
        }
    }

    /// Average length of one cycle in days. Used only where an approximation is
    /// acceptable — pro-rating a trailing spending average, for example. Exact
    /// date stepping always goes through `CycleCalendar`.
    public var approximateDayLength: Double {
        switch self {
        case .weekly: return 7
        case .biweekly: return 14
        case .semimonthly: return 365.0 / 24
        case .monthly: return 365.0 / 12
        }
    }

    /// How many budgets fall in a calendar year, used by the insights screen.
    public var budgetsPerYear: Int {
        switch self {
        case .weekly: return 52
        case .biweekly: return 26
        case .semimonthly: return 24
        case .monthly: return 12
        }
    }
}
