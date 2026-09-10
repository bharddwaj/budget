import SwiftUI
import BudgetKit

/// The keypad used for stuffing envelopes and for entering transactions.
///
/// Digits fill in from the right like a till, and the `+` / `-` / `=` column
/// lets someone adjust an existing balance without doing the arithmetic in their
/// head — the thing that makes Budget Bestie's stuffing screen quick.
struct BudgetKeypad: View {
    @Binding var engine: KeypadEngine
    /// The engine-calculated recommendation behind the `suggested` chip. Pass
    /// nil to hide the chip, as the transaction sheet does.
    var suggested: Money?
    /// Shows the `empty` chip, which zeroes the envelope in one tap.
    var showsEmpty: Bool = true

    private let columns = Array(repeating: GridItem(.flexible(), spacing: Theme.Spacing.small), count: 4)

    var body: some View {
        VStack(spacing: Theme.Spacing.medium) {
            if suggested != nil || showsEmpty {
                HStack(spacing: Theme.Spacing.small) {
                    if let suggested {
                        ChipButton(title: "suggested", icon: "sparkles") {
                            engine.press(.suggested, suggested: suggested)
                        }
                    }
                    if showsEmpty {
                        ChipButton(title: "empty", icon: "circle.slash") {
                            engine.press(.empty)
                        }
                    }
                    Spacer()
                }
            }

            LazyVGrid(columns: columns, spacing: Theme.Spacing.small) {
                key(.digit(1), "1")
                key(.digit(2), "2")
                key(.digit(3), "3")
                key(.add, "+", style: .operation)

                key(.digit(4), "4")
                key(.digit(5), "5")
                key(.digit(6), "6")
                key(.subtract, "−", style: .operation)

                key(.digit(7), "7")
                key(.digit(8), "8")
                key(.digit(9), "9")
                key(.equals, "=", style: .operation)

                key(.doubleZero, "00")
                key(.digit(0), "0")
                key(.delete, "", symbol: "delete.left", style: .operation)
                Color.clear
                    .frame(height: 1)
            }
        }
    }

    private enum KeyStyle {
        case digit
        case operation
    }

    private func key(
        _ key: KeypadKey,
        _ label: String,
        symbol: String? = nil,
        style: KeyStyle = .digit
    ) -> some View {
        Button {
            engine.press(key)
        } label: {
            Group {
                if let symbol {
                    Image(systemName: symbol)
                        .font(.system(size: 22, weight: .medium))
                } else {
                    Text(label)
                        .font(Theme.Font.keypadKey)
                }
            }
            .foregroundStyle(style == .digit ? Palette.textPrimary : Palette.accent)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(style == .digit ? Palette.surfaceMuted : Palette.accentSoft)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.chip, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel(for: key, label: label))
    }

    private func accessibilityLabel(for key: KeypadKey, label: String) -> String {
        switch key {
        case .delete: return "Delete"
        case .add: return "Plus"
        case .subtract: return "Minus"
        case .equals: return "Equals"
        default: return label
        }
    }
}

/// The large amount above the keypad, with the pending expression when one is
/// in flight (e.g. "$40.00 +").
struct KeypadDisplay: View {
    var engine: KeypadEngine
    var caption: String?

    @Environment(\.currencyFormat) private var format

    var body: some View {
        VStack(spacing: Theme.Spacing.tight) {
            if let expression {
                Text(expression)
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                    .transition(.opacity)
            }

            AmountText(amount: engine.value, font: Theme.Font.hero)

            if let caption {
                Text(caption)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
        .animation(Theme.Motion.value, value: engine.hasPendingOperation)
    }

    private var expression: String? {
        guard let pending = engine.pendingValue, let operation = engine.pendingOperation else {
            return nil
        }
        let symbol = operation == .add ? "+" : "−"
        return "\(format.string(from: pending)) \(symbol)"
    }
}

#Preview {
    struct Harness: View {
        @State private var engine = KeypadEngine(value: Money(major: 82))
        var body: some View {
            VStack(spacing: Theme.Spacing.large) {
                KeypadDisplay(engine: engine, caption: "You spend about $76.00 here each budget.")
                BudgetKeypad(engine: $engine, suggested: Money(major: 76))
                PillButton(title: "next") { _ = engine.commit() }
            }
            .padding(Theme.Spacing.screenMargin)
            .background(Palette.background)
        }
    }
    return Harness()
}
