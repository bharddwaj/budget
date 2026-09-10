import SwiftUI
import BudgetKit

/// Renders a `Money` using the user's currency settings.
///
/// Amounts animate between values and colour themselves by sign when asked, so
/// the remaining-to-stuff ticker and the envelope rows both read at a glance.
struct AmountText: View {
    var amount: Money
    var font: Font = Theme.Font.body
    /// Show `+` in front of positive amounts, for transaction lists.
    var showsSign: Bool = false
    /// Colour by sign instead of using the primary text colour.
    var colorBySign: Bool = false
    var color: Color?

    @Environment(\.currencyFormat) private var format

    var body: some View {
        Text(format.string(from: amount, showsSign: showsSign))
            .font(font)
            .foregroundStyle(resolvedColor)
            .monospacedDigit()
            .contentTransition(.numericText())
            .animation(Theme.Motion.value, value: amount)
    }

    private var resolvedColor: Color {
        if let color { return color }
        guard colorBySign else { return Palette.textPrimary }
        if amount.isNegative { return Palette.negative }
        if amount.isPositive { return Palette.positive }
        return Palette.textSecondary
    }
}

#Preview {
    VStack(alignment: .trailing, spacing: Theme.Spacing.small) {
        AmountText(amount: Money(major: 1240.5), font: Theme.Font.hero)
        AmountText(amount: Money(major: -32), colorBySign: true)
        AmountText(amount: Money(major: 480), showsSign: true, colorBySign: true)
    }
    .padding()
    .background(Palette.background)
}
