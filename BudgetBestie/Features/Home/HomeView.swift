import SwiftUI
import SwiftData
import BudgetKit

/// The main screen: the donut of where your money sits, the budget-day banner,
/// and your envelopes grouped by type.
struct HomeView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AppRoute.self) private var route

    @Query(sort: \Envelope.sortIndex) private var allEnvelopes: [Envelope]
    @Query(filter: #Predicate<BudgetCycle> { $0.isActive }) private var activeCycles: [BudgetCycle]

    @State private var selectedEnvelope: Envelope?

    private var cycle: BudgetCycle? { activeCycles.first }

    private var envelopes: [Envelope] {
        allEnvelopes
            .filter { !$0.isRetired }
            .sorted { lhs, rhs in
                let lhsRank = EnvelopeKind.displayOrder.firstIndex(of: lhs.kind) ?? 0
                let rhsRank = EnvelopeKind.displayOrder.firstIndex(of: rhs.kind) ?? 0
                if lhsRank != rhsRank { return lhsRank < rhsRank }
                return lhs.sortIndex < rhs.sortIndex
            }
    }

    private var totalOnHand: Money {
        envelopes.map(\.balance).total
    }

    private var slices: [DonutSlice] {
        EnvelopeKind.displayOrder.map { kind in
            DonutSlice(
                id: kind.rawValue,
                label: kind.title,
                amount: envelopes.filter { $0.kind == kind }.map(\.balance).total,
                color: kind.color
            )
        }
    }

    /// Fixed envelopes whose bill is due and unpaid, surfaced above the list so
    /// a late fee is hard to walk into.
    private var outstandingBills: [Envelope] {
        envelopes.filter { $0.isBillOutstanding() }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: Theme.Spacing.large, pinnedViews: []) {
                    if let cycle, cycle.isBudgetDue() {
                        BudgetDayBanner(cycle: cycle) { route.isBudgeting = true }
                    }

                    summaryCard

                    if !outstandingBills.isEmpty {
                        outstandingBillsCard
                    }

                    if envelopes.isEmpty {
                        emptyState
                    } else {
                        ForEach(EnvelopeKind.displayOrder, id: \.self) { kind in
                            envelopeSection(for: kind)
                        }
                    }
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.medium)
            }
            .background(Palette.background)
            .navigationTitle("Your envelopes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
            .navigationDestination(item: $selectedEnvelope) { envelope in
                EnvelopeDetailView(envelope: envelope)
            }
        }
    }

    // MARK: - Pieces

    private var summaryCard: some View {
        VStack(spacing: Theme.Spacing.large) {
            DonutChart(slices: slices, centerTitle: "you have", centerAmount: totalOnHand)
            DonutLegend(slices: slices)

            if let cycle {
                Divider().overlay(Palette.separator)
                HStack {
                    Text("Next budget")
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textSecondary)
                    Spacer()
                    Text(nextBudgetText(for: cycle))
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textPrimary)
                }
            }
        }
        .card(padding: Theme.Spacing.large)
    }

    private var outstandingBillsCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Waiting to be paid", tint: Palette.warning)
            ForEach(outstandingBills, id: \.id) { envelope in
                HStack(spacing: Theme.Spacing.small) {
                    Text(envelope.emoji)
                    Text(envelope.name)
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textPrimary)
                    Spacer()
                    AmountText(
                        amount: envelope.billAmount ?? envelope.balance,
                        font: Theme.Font.callout,
                        color: Palette.warning
                    )
                }
            }
        }
        .card(background: Palette.warning.opacity(0.10))
    }

    private func envelopeSection(for kind: EnvelopeKind) -> some View {
        let group = envelopes.filter { $0.kind == kind }
        return Group {
            if group.isEmpty {
                EmptyView()
            } else {
                VStack(alignment: .leading, spacing: Theme.Spacing.small) {
                    SectionHeader(
                        title: kind.sectionTitle,
                        tint: kind.color,
                        trailing: totalText(for: group)
                    )
                    VStack(spacing: 0) {
                        ForEach(Array(group.enumerated()), id: \.element.id) { index, envelope in
                            Button {
                                selectedEnvelope = envelope
                            } label: {
                                EnvelopeRow(envelope: envelope, cycle: cycle)
                            }
                            .buttonStyle(.plain)

                            if index < group.count - 1 {
                                Divider().overlay(Palette.separator)
                            }
                        }
                    }
                    .card()
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Theme.Spacing.medium) {
            Text("🧧")
                .font(.system(size: 52))
            Text("No envelopes yet")
                .font(Theme.Font.title)
                .foregroundStyle(Palette.textPrimary)
            Text("Make one for each thing you spend on, then stuff them on your budget day.")
                .font(Theme.Font.callout)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
            PillButton(title: "create an envelope", icon: "plus") {
                route.createEnvelope()
            }
        }
        .padding(.vertical, Theme.Spacing.section)
        .card(padding: Theme.Spacing.large)
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button {
                route.addTransaction()
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .bold))
            }
            .accessibilityLabel("Add a transaction")
        }

        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button("Start new budget", systemImage: "sparkles") {
                    route.isBudgeting = true
                }
                Button("Create new envelope", systemImage: "plus.circle") {
                    route.createEnvelope()
                }
                Button("Transfer between envelopes", systemImage: "arrow.left.arrow.right") {
                    route.isTransferring = true
                }
                Button("Arrange envelopes", systemImage: "arrow.up.arrow.down") {
                    route.isArrangingEnvelopes = true
                }
                Divider()
                Button("Settings", systemImage: "gearshape") {
                    route.isShowingSettings = true
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 16, weight: .bold))
            }
            .accessibilityLabel("More")
        }
    }

    // MARK: - Text

    private func totalText(for group: [Envelope]) -> String {
        let format = settingsFormat
        return format.string(from: group.map(\.balance).total)
    }

    @Environment(\.currencyFormat) private var settingsFormat

    private func nextBudgetText(for cycle: BudgetCycle) -> String {
        let days = cycle.daysUntilNextBudget()
        switch days {
        case ..<0: return "Overdue"
        case 0: return "Today"
        case 1: return "Tomorrow"
        default: return "in \(days) days"
        }
    }
}

/// The banner that appears on your scheduled budget day.
struct BudgetDayBanner: View {
    var cycle: BudgetCycle
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Spacing.medium) {
                Text("✨")
                    .font(.system(size: 30))
                VStack(alignment: .leading, spacing: 2) {
                    Text("It's budget day")
                        .font(Theme.Font.headline)
                        .foregroundStyle(Palette.textPrimary)
                    Text("Let's stuff your envelopes for the next \(cycle.frequency.adverb.replacingOccurrences(of: "every ", with: ""))")
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.textSecondary)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.accent)
            }
            .card(background: Palette.accentSoft)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    HomeView()
        .environment(AppRoute())
        .modelContainer(AppModelContainer.makePreview())
}
