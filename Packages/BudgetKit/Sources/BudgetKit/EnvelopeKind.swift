import Foundation

/// The three stuffing methods Budget Bestie offers, which decide what extra
/// fields an envelope carries and how its suggested allocation is calculated.
public enum EnvelopeKind: String, Hashable, Sendable, Codable, CaseIterable, Identifiable {
    /// Costs that move around: groceries, gas, fun money.
    case variable
    /// Recurring bills on a schedule: rent, insurance, phone, debt payments.
    case fixed
    /// Money set aside toward a goal, optionally with a deadline.
    case savings

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .variable: return "Variable"
        case .fixed: return "Fixed"
        case .savings: return "Savings"
        }
    }

    /// The plural heading used above each group on the home screen.
    public var sectionTitle: String {
        switch self {
        case .variable: return "Variable envelopes"
        case .fixed: return "Fixed envelopes"
        case .savings: return "Savings envelopes"
        }
    }

    public var blurb: String {
        switch self {
        case .variable:
            return "For costs that change month to month, like groceries or fun money."
        case .fixed:
            return "For bills that come on a schedule, like rent or your phone."
        case .savings:
            return "For money you're setting aside toward a goal."
        }
    }

    /// Order the home screen and the stuffing flow walk the envelope groups in.
    public static let displayOrder: [EnvelopeKind] = [.variable, .fixed, .savings]

    /// Fixed bills are assumed spendable on a spend-free day, since paying rent
    /// is not the kind of spending a no-spend streak is meant to discourage.
    public var isSpendFreeByDefault: Bool {
        self == .fixed
    }
}
