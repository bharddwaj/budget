import SwiftUI
import Charts
import BudgetKit

/// One day's totals for the money-in/money-out chart.
struct InOutPoint: Identifiable, Hashable {
    var day: Date
    var incoming: Money
    var outgoing: Money

    var id: Date { day }
}

/// Paired bars per day: income up in green, spending down in red, so a pay week
/// and a heavy spending week are distinguishable at a glance.
struct InOutChart: View {
    var points: [InOutPoint]

    var body: some View {
        if points.isEmpty {
            Text("No activity in this window")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            Chart {
                ForEach(points) { point in
                    if point.incoming.isPositive {
                        BarMark(
                            x: .value("Day", point.day, unit: .day),
                            y: .value("In", point.incoming.doubleValue)
                        )
                        .foregroundStyle(Palette.positive)
                        .cornerRadius(3)
                    }
                    if point.outgoing.isPositive {
                        BarMark(
                            x: .value("Day", point.day, unit: .day),
                            y: .value("Out", -point.outgoing.doubleValue)
                        )
                        .foregroundStyle(Palette.negative)
                        .cornerRadius(3)
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine().foregroundStyle(Palette.separator)
                    AxisValueLabel {
                        // Bars below the axis are spending; show them unsigned.
                        if let amount = value.as(Double.self) {
                            Text(abs(amount), format: .number.precision(.fractionLength(0)))
                                .font(Theme.Font.caption)
                                .foregroundStyle(Palette.textSecondary)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
            }
        }
    }
}

#Preview {
    let today = Date()
    let points = (0..<10).compactMap { offset -> InOutPoint? in
        guard let day = Calendar.current.date(byAdding: .day, value: -offset, to: today) else {
            return nil
        }
        return InOutPoint(
            day: day,
            incoming: offset % 7 == 0 ? Money(major: 1800) : .zero,
            outgoing: Money(major: Double(20 + offset * 9))
        )
    }
    return InOutChart(points: points)
        .frame(height: 160)
        .padding()
        .background(Palette.surface)
}
