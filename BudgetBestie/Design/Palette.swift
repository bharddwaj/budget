import SwiftUI

/// Every colour in the app, defined once.
///
/// Each token resolves itself for light and dark at draw time, so no view ever
/// branches on `colorScheme`, and re-skinning the app is a change to this file
/// alone. Values are hex literals rather than asset-catalog entries so they can
/// be read and diffed as code.
enum Palette {

    // MARK: - Surfaces

    /// The page behind everything: a warm off-white lilac in light mode.
    static let background = dynamic(light: 0xFAF7FB, dark: 0x141019)
    /// Cards, sheets and rows that sit on the background.
    static let surface = dynamic(light: 0xFFFFFF, dark: 0x1E1826)
    /// Recessed fills: keypad keys, progress tracks, unselected segments.
    static let surfaceMuted = dynamic(light: 0xF1EBF7, dark: 0x2A2235)
    /// Hairlines and dividers.
    static let separator = dynamic(light: 0xE7DFEF, dark: 0x342B41)

    // MARK: - Text

    static let textPrimary = dynamic(light: 0x2E2440, dark: 0xF4F0F8)
    static let textSecondary = dynamic(light: 0x6F6683, dark: 0xA79FB5)
    /// For text drawn on top of `accent`.
    static let textOnAccent = dynamic(light: 0xFFFFFF, dark: 0x1A1322)

    // MARK: - Brand

    static let accent = dynamic(light: 0x8473D4, dark: 0xA898E5)
    /// Tinted backgrounds for accent-coloured chips and banners.
    static let accentSoft = dynamic(light: 0xE9E4FA, dark: 0x2E2647)

    // MARK: - Envelope types

    /// Blush pink for variable envelopes.
    static let variable = dynamic(light: 0xEE8FAE, dark: 0xF09DB9)
    /// Sky blue for fixed bills.
    static let fixed = dynamic(light: 0x62B6E0, dark: 0x77C3E9)
    /// Mint for savings.
    static let savings = dynamic(light: 0x62C08C, dark: 0x7ACF9F)

    // MARK: - Status

    static let positive = dynamic(light: 0x3E9E6E, dark: 0x63C795)
    static let negative = dynamic(light: 0xDB4F68, dark: 0xF07C90)
    static let warning = dynamic(light: 0xE0983E, dark: 0xEDB365)
    /// Calendar day that stayed spend-free.
    static let spendFree = dynamic(light: 0x6FCF97, dark: 0x5FB585)
    /// Calendar day broken by an off-limits expense.
    static let spendBroken = dynamic(light: 0xEB8A90, dark: 0xC9666D)

    static func forKind(_ kind: EnvelopeKindColorRole) -> Color {
        switch kind {
        case .variable: return variable
        case .fixed: return fixed
        case .savings: return savings
        }
    }

    /// Builds a colour that resolves per interface style at draw time.
    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

/// Mirrors `BudgetKit.EnvelopeKind` without importing it, so the design layer
/// stays independent of the domain layer.
enum EnvelopeKindColorRole {
    case variable
    case fixed
    case savings
}

private extension UIColor {
    /// 0xRRGGBB, fully opaque.
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
