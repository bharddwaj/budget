import SwiftUI

/// The full-width rounded button that drives every primary action —
/// "stuff your money", "yup, looks right", "create budget", "Add Transaction".
struct PillButton: View {
    enum Style {
        /// Filled accent. One per screen.
        case primary
        /// Tinted accent-on-soft, for the secondary choice beside a primary.
        case secondary
        /// Text only, used for "previous" and other quiet escapes.
        case quiet
        /// Filled in the destructive red.
        case destructive
    }

    var title: String
    var style: Style = .primary
    var icon: String?
    var isEnabled: Bool = true
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Spacing.small) {
                if let icon {
                    Image(systemName: icon)
                }
                Text(title)
            }
            .font(Theme.Font.headline)
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(background)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(!isEnabled)
        .opacity(isEnabled ? 1 : 0.45)
        .animation(Theme.Motion.value, value: isEnabled)
    }

    private var foreground: Color {
        switch style {
        case .primary, .destructive: return Palette.textOnAccent
        case .secondary, .quiet: return Palette.accent
        }
    }

    private var background: Color {
        switch style {
        case .primary: return Palette.accent
        case .secondary: return Palette.accentSoft
        case .quiet: return .clear
        case .destructive: return Palette.negative
        }
    }
}

/// A small tappable capsule used for filters, envelope-type pickers and the
/// keypad's `suggested` / `empty` shortcuts.
struct ChipButton: View {
    var title: String
    var icon: String?
    var isSelected: Bool = false
    var tint: Color = Palette.accent
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Spacing.tight) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .bold))
                }
                Text(title)
            }
            .font(Theme.Font.caption)
            .foregroundStyle(isSelected ? Palette.textOnAccent : tint)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(isSelected ? tint : tint.opacity(0.14))
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .animation(Theme.Motion.value, value: isSelected)
    }
}

#Preview {
    VStack(spacing: Theme.Spacing.medium) {
        PillButton(title: "stuff your money") {}
        PillButton(title: "review", style: .secondary) {}
        PillButton(title: "previous", style: .quiet) {}
        PillButton(title: "delete envelope", style: .destructive) {}
        PillButton(title: "create budget", isEnabled: false) {}
        HStack {
            ChipButton(title: "suggested", icon: "sparkles") {}
            ChipButton(title: "Variable", isSelected: true, tint: Palette.variable) {}
        }
    }
    .padding(Theme.Spacing.screenMargin)
    .background(Palette.background)
}
