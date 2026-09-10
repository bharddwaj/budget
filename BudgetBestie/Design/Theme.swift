import SwiftUI
import BudgetKit

/// Layout, type and shape constants. Paired with `Palette`, this is the whole
/// design system — views compose these rather than inventing numbers.
enum Theme {

    // MARK: - Spacing

    enum Spacing {
        /// Between tightly-related elements, e.g. a label and its amount.
        static let tight: CGFloat = 6
        static let small: CGFloat = 10
        /// The default gap between rows inside a card.
        static let medium: CGFloat = 16
        /// Between cards.
        static let large: CGFloat = 22
        static let section: CGFloat = 32
        /// Left and right page margin, matching Budget Bestie's roomy gutters.
        static let screenMargin: CGFloat = 20
    }

    // MARK: - Shape

    enum Radius {
        static let chip: CGFloat = 12
        static let card: CGFloat = 22
        static let sheet: CGFloat = 28
        /// Buttons are fully rounded pills.
        static let pill: CGFloat = 999
    }

    // MARK: - Type

    /// The app is set entirely in the rounded system face, which is most of what
    /// gives Budget Bestie its soft, friendly feel.
    enum Font {
        static let hero = SwiftUI.Font.system(size: 44, weight: .bold, design: .rounded)
        static let amount = SwiftUI.Font.system(size: 32, weight: .bold, design: .rounded)
        static let title = SwiftUI.Font.system(size: 26, weight: .bold, design: .rounded)
        static let headline = SwiftUI.Font.system(size: 18, weight: .semibold, design: .rounded)
        static let body = SwiftUI.Font.system(size: 16, weight: .medium, design: .rounded)
        static let callout = SwiftUI.Font.system(size: 15, weight: .medium, design: .rounded)
        static let caption = SwiftUI.Font.system(size: 13, weight: .medium, design: .rounded)
        /// All-caps section headings above envelope groups.
        static let sectionLabel = SwiftUI.Font.system(size: 12, weight: .bold, design: .rounded)
        static let keypadKey = SwiftUI.Font.system(size: 28, weight: .medium, design: .rounded)
    }

    // MARK: - Elevation

    enum Shadow {
        static let card = Color.black.opacity(0.05)
        static let cardRadius: CGFloat = 14
        static let cardY: CGFloat = 4
    }

    // MARK: - Motion

    enum Motion {
        /// Used for balance changes and progress bars so numbers feel alive.
        static let value = Animation.spring(response: 0.35, dampingFraction: 0.82)
        static let sheet = Animation.spring(response: 0.42, dampingFraction: 0.86)
    }
}

// MARK: - Domain bridges

extension EnvelopeKind {
    /// The colour this envelope type is drawn in throughout the app.
    var color: Color {
        switch self {
        case .variable: return Palette.variable
        case .fixed: return Palette.fixed
        case .savings: return Palette.savings
        }
    }

    /// SF Symbol used where an envelope's own emoji is not shown.
    var symbolName: String {
        switch self {
        case .variable: return "cart.fill"
        case .fixed: return "calendar.badge.clock"
        case .savings: return "banknote.fill"
        }
    }
}

extension SpendFreeStatus {
    var color: Color {
        switch self {
        case .spendFree: return Palette.spendFree
        case .spent: return Palette.spendBroken
        case .upcoming, .untracked: return Palette.surfaceMuted
        }
    }
}
