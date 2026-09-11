import SwiftUI
import Charts
import BudgetKit

/// One wedge of the home screen's donut.
struct DonutSlice: Identifiable, Hashable {
    let id: String
    var label: String
    var amount: Money
    var color: Color

    init(id: String, label: String, amount: Money, color: Color) {
        self.id = id
        self.label = label
        self.amount = amount
        self.color = color
    }
}

/// The hero chart on the home screen: where your money is sitting right now,
/// split by envelope type, with the total in the middle.
struct DonutChart: View {
    var slices: [DonutSlice]
    var centerTitle: String
    var centerAmount: Money
    var diameter: CGFloat = 190

    /// How much of the radius is hole; the ring is the rest.
    private static let innerRadiusRatio: CGFloat = 0.68

    @Environment(\.currencyFormat) private var format

    private var positiveSlices: [DonutSlice] {
        slices.filter { $0.amount.isPositive }
    }

    var body: some View {
        ZStack {
            if positiveSlices.isEmpty {
                Circle()
                    .strokeBorder(Palette.surfaceMuted, lineWidth: diameter * (1 - Self.innerRadiusRatio) / 2)
            } else {
                Chart(positiveSlices) { slice in
                    SectorMark(
                        angle: .value("Amount", slice.amount.doubleValue),
                        innerRadius: .ratio(Self.innerRadiusRatio),
                        angularInset: 1.5
                    )
                    .cornerRadius(4)
                    .foregroundStyle(slice.color)
                }
                .chartLegend(.hidden)
            }

            VStack(spacing: 2) {
                Text(centerTitle)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: centerAmount, font: Theme.Font.amount)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }
            // Keep the label inside the hole: a five-figure total at full size
            // is wider than the ring's inner diameter.
            .frame(width: diameter * Self.innerRadiusRatio * 0.9)
        }
        .frame(width: diameter, height: diameter)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityDescription)
    }

    private var accessibilityDescription: String {
        let breakdown = positiveSlices
            .map { "\($0.label) \(format.string(from: $0.amount))" }
            .joined(separator: ", ")
        return "\(centerTitle) \(format.string(from: centerAmount)). \(breakdown)"
    }
}

/// The key beneath the donut: a dot, a name and an amount per wedge.
struct DonutLegend: View {
    var slices: [DonutSlice]

    var body: some View {
        VStack(spacing: Theme.Spacing.small) {
            ForEach(slices) { slice in
                HStack(spacing: Theme.Spacing.small) {
                    Circle()
                        .fill(slice.color)
                        .frame(width: 10, height: 10)
                    Text(slice.label)
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textSecondary)
                    Spacer()
                    AmountText(amount: slice.amount, font: Theme.Font.callout)
                }
            }
        }
    }
}

#Preview {
    let slices = [
        DonutSlice(id: "v", label: "Variable", amount: Money(major: 790), color: Palette.variable),
        DonutSlice(id: "f", label: "Fixed", amount: Money(major: 1_060), color: Palette.fixed),
        DonutSlice(id: "s", label: "Savings", amount: Money(major: 550), color: Palette.savings)
    ]
    return VStack(spacing: Theme.Spacing.large) {
        DonutChart(slices: slices, centerTitle: "you have", centerAmount: Money(major: 2400))
        DonutLegend(slices: slices)
            .card()
    }
    .padding()
    .background(Palette.background)
}
