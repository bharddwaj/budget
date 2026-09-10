import SwiftUI
import SwiftData
import Charts
import BudgetKit

/// The recap tab: where the money actually went, how this stretch compares with
/// the last one, and how the savings goals are coming along.
struct InsightsView: View {
    @Environment(\.currencyFormat) private var format

    @Query private var envelopes: [Envelope]
    @Query(sort: [SortDescriptor(\Transaction.date, order: .reverse)])
    private var transactions: [Transaction]

    @State private var range: DateRangeFilter = .thisMonth

    private var windowStart: Date { range.startDate() }

    private var expenses: [Transaction] {
        transactions.filter { $0.kind == .expense && $0.date >= windowStart }
    }

    private var totalSpent: Money {
        expenses.map(\.amount).total
    }

    private var totalEarned: Money {
        transactions
            .filter { $0.kind == .income && $0.date >= windowStart }
            .map(\.amount).total
    }

    /// Spending per envelope, biggest first — the "where did it go" list.
    private var byEnvelope: [(envelope: Envelope, amount: Money)] {
        let grouped = Dictionary(grouping: expenses.filter { $0.envelope != nil }) { $0.envelope! }
        return grouped
            .map { (envelope: $0.key, amount: $0.value.map(\.amount).total) }
            .filter { $0.amount.isPositive }
            .sorted { $0.amount > $1.amount }
    }

    private var byKind: [DonutSlice] {
        EnvelopeKind.displayOrder.map { kind in
            DonutSlice(
                id: kind.rawValue,
                label: kind.title,
                amount: expenses
                    .filter { $0.envelope?.kind == kind }
                    .map(\.amount)
                    .total,
                color: kind.color
            )
        }
    }

    /// The same length of time immediately before the window, for comparison.
    private var previousPeriodSpend: Money {
        let length = Date().timeIntervalSince(windowStart)
        guard length > 0, range != .allTime else { return .zero }
        let previousStart = windowStart.addingTimeInterval(-length)
        return transactions
            .filter { $0.kind == .expense && $0.date >= previousStart && $0.date < windowStart }
            .map(\.amount)
            .total
    }

    private var savingsEnvelopes: [Envelope] {
        envelopes.filter { $0.kind == .savings && !$0.isRetired }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.large) {
                    rangePicker
                    headlineCard

                    if expenses.isEmpty {
                        emptyState
                    } else {
                        splitCard
                        topEnvelopesCard
                    }

                    if !savingsEnvelopes.isEmpty {
                        savingsCard
                    }
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.medium)
            }
            .background(Palette.background)
            .navigationTitle("Your recap")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    // MARK: - Pieces

    private var rangePicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.Spacing.small) {
                ForEach(DateRangeFilter.allCases) { candidate in
                    ChipButton(title: candidate.title, isSelected: range == candidate) {
                        range = candidate
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var headlineCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            VStack(spacing: 2) {
                Text("you spent")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: totalSpent, font: Theme.Font.hero)
            }

            if let comparison {
                Text(comparison)
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
            }

            Divider().overlay(Palette.separator)

            HStack {
                Text("you made")
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(amount: totalEarned, font: Theme.Font.headline, color: Palette.positive)
            }
            HStack {
                Text("net")
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(
                    amount: totalEarned - totalSpent,
                    font: Theme.Font.headline,
                    showsSign: true,
                    colorBySign: true
                )
            }
        }
        .card(padding: Theme.Spacing.large)
    }

    /// A plain-language comparison rather than a bare percentage, because the
    /// direction is the part that matters.
    private var comparison: String? {
        guard previousPeriodSpend.isPositive else { return nil }
        let difference = totalSpent - previousPeriodSpend
        if difference.isZero { return "Exactly the same as the period before." }
        let word = difference.isNegative ? "less" : "more"
        return "\(format.string(from: difference.magnitude)) \(word) than the period before."
    }

    private var splitCard: some View {
        VStack(spacing: Theme.Spacing.large) {
            SectionHeader(title: "By envelope type")
            DonutChart(
                slices: byKind,
                centerTitle: "spent",
                centerAmount: totalSpent,
                diameter: 170
            )
            DonutLegend(slices: byKind)
        }
        .card(padding: Theme.Spacing.large)
    }

    private var topEnvelopesCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
            SectionHeader(title: "Where it went")

            Chart(byEnvelope.prefix(8), id: \.envelope.id) { entry in
                BarMark(
                    x: .value("Spent", entry.amount.doubleValue),
                    y: .value("Envelope", "\(entry.envelope.emoji) \(entry.envelope.name)")
                )
                .foregroundStyle(entry.envelope.kind.color)
                .cornerRadius(6)
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisGridLine().foregroundStyle(Palette.separator)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisValueLabel()
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
            }
            .frame(height: CGFloat(min(byEnvelope.count, 8)) * 34 + 20)
        }
        .card()
    }

    private var savingsCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
            SectionHeader(title: "Your goals")
            ForEach(savingsEnvelopes, id: \.id) { envelope in
                VStack(alignment: .leading, spacing: Theme.Spacing.tight) {
                    HStack {
                        Text("\(envelope.emoji) \(envelope.name)")
                            .font(Theme.Font.body)
                            .foregroundStyle(Palette.textPrimary)
                        Spacer()
                        Text("\(format.string(from: envelope.balance)) / \(format.string(from: envelope.goalAmount ?? .zero))")
                            .font(Theme.Font.caption)
                            .foregroundStyle(Palette.textSecondary)
                    }
                    ProgressTrack(progress: envelope.goalProgress ?? 0, tint: Palette.savings)
                }
            }
        }
        .card()
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.small) {
            Text("📊").font(.system(size: 44))
            Text("Nothing to recap yet")
                .font(Theme.Font.headline)
                .foregroundStyle(Palette.textPrimary)
            Text("Record a few transactions and this fills itself in.")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.section)
        .card()
    }
}

#Preview {
    InsightsView()
        .modelContainer(AppModelContainer.makePreview())
}
