import SwiftUI
import SwiftData
import BudgetKit

/// The overview tab: a month calendar coloured by spend-free days, your current
/// streak, and what's coming up.
struct OverviewCalendarView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(AppRoute.self) private var route

    @Query private var envelopes: [Envelope]
    @Query private var transactions: [Transaction]
    @Query private var settingsRows: [AppSettings]
    @Query(filter: #Predicate<BudgetCycle> { $0.isActive }) private var activeCycles: [BudgetCycle]

    @State private var visibleMonth = Date()
    @State private var isConfiguringNoSpend = false

    private let evaluator = NoSpendEvaluator()
    private var settings: AppSettings? { settingsRows.first }
    private var cycle: BudgetCycle? { activeCycles.first }

    private var offLimitsIDs: Set<UUID> {
        Set(envelopes.filter(\.isOffLimitsForNoSpend).map(\.id))
    }

    private var monthInterval: DateInterval {
        Calendar.current.dateInterval(of: .month, for: visibleMonth)
            ?? DateInterval(start: visibleMonth, duration: 0)
    }

    private var statuses: [Date: SpendFreeStatus] {
        evaluator.statuses(
            from: monthInterval.start,
            to: monthInterval.end.addingTimeInterval(-1),
            events: transactions.compactMap(\.spendEvent),
            offLimitsEnvelopeIDs: offLimitsIDs,
            trackingStart: settings?.noSpendTrackingStart,
            today: Date()
        )
    }

    /// The streak is counted across all of history, not just the visible month.
    private var streak: Int {
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .day, value: -365, to: Date()) ?? Date()
        let allStatuses = evaluator.statuses(
            from: start,
            to: Date(),
            events: transactions.compactMap(\.spendEvent),
            offLimitsEnvelopeIDs: offLimitsIDs,
            trackingStart: settings?.noSpendTrackingStart,
            today: Date()
        )
        return evaluator.currentStreak(statuses: allStatuses, today: Date())
    }

    /// Bills and recurring expenses falling in the rest of the month.
    private var upcoming: [(date: Date, envelope: Envelope)] {
        let now = Date()
        return envelopes
            .filter { $0.kind == .fixed && !$0.isRetired }
            .compactMap { envelope in
                guard let due = envelope.billDueDate, due >= Calendar.current.startOfDay(for: now) else {
                    return nil
                }
                return (date: due, envelope: envelope)
            }
            .sorted { $0.date < $1.date }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.large) {
                    streakCard
                    calendarCard
                    if let cycle {
                        nextBudgetCard(cycle)
                    }
                    if !upcoming.isEmpty {
                        upcomingCard
                    }
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.medium)
            }
            .background(Palette.background)
            .navigationTitle("Overview")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $isConfiguringNoSpend) {
                NoSpendSettingsSheet()
            }
        }
    }

    // MARK: - Pieces

    private var streakCard: some View {
        HStack(spacing: Theme.Spacing.large) {
            VStack(alignment: .leading, spacing: 2) {
                Text("days spend-free")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                Text("\(streak)")
                    .font(Theme.Font.hero)
                    .foregroundStyle(Palette.textPrimary)
                    .contentTransition(.numericText())
                Text(streak == 1 ? "day in a row" : "days in a row")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
            }
            Spacer()
            Button {
                isConfiguringNoSpend = true
            } label: {
                Image(systemName: "info.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(Palette.accent)
            }
            .accessibilityLabel("Choose which envelopes are off limits")
        }
        .card(padding: Theme.Spacing.large)
        .animation(Theme.Motion.value, value: streak)
    }

    private var calendarCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            HStack {
                Button {
                    shiftMonth(by: -1)
                } label: {
                    Image(systemName: "chevron.left")
                }
                Spacer()
                Text(visibleMonth.formatted(.dateTime.month(.wide).year()))
                    .font(Theme.Font.headline)
                    .foregroundStyle(Palette.textPrimary)
                Spacer()
                Button {
                    shiftMonth(by: 1)
                } label: {
                    Image(systemName: "chevron.right")
                }
            }
            .foregroundStyle(Palette.accent)

            MonthCalendarGrid(
                month: visibleMonth,
                statuses: statuses,
                markedDays: Set(upcoming.map { Calendar.current.startOfDay(for: $0.date) })
            )

            HStack(spacing: Theme.Spacing.medium) {
                legendDot(Palette.spendFree, "spend-free")
                legendDot(Palette.spendBroken, "you spent")
                legendDot(Palette.accent, "bill due")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .card()
    }

    private func legendDot(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(label)
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
        }
    }

    private func nextBudgetCard(_ cycle: BudgetCycle) -> some View {
        HStack(spacing: Theme.Spacing.medium) {
            Text("🗓️").font(.system(size: 26))
            VStack(alignment: .leading, spacing: 2) {
                Text("Next budget")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                Text(cycle.nextBudgetDate.formatted(.dateTime.weekday(.wide).month().day()))
                    .font(Theme.Font.headline)
                    .foregroundStyle(Palette.textPrimary)
            }
            Spacer()
            if cycle.isBudgetDue() {
                ChipButton(title: "budget now", icon: "sparkles") {
                    route.isBudgeting = true
                }
            }
        }
        .card()
    }

    private var upcomingCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Coming up")
            VStack(spacing: 0) {
                ForEach(upcoming.prefix(6), id: \.envelope.id) { entry in
                    HStack(spacing: Theme.Spacing.medium) {
                        EmojiBadge(emoji: entry.envelope.emoji, tint: entry.envelope.kind.color, size: 34)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.envelope.name)
                                .font(Theme.Font.body)
                                .foregroundStyle(Palette.textPrimary)
                            Text(entry.date.formatted(.dateTime.month().day()))
                                .font(Theme.Font.caption)
                                .foregroundStyle(Palette.textSecondary)
                        }
                        Spacer()
                        AmountText(
                            amount: entry.envelope.billAmount ?? .zero,
                            font: Theme.Font.callout
                        )
                    }
                    .padding(.vertical, Theme.Spacing.small)

                    if entry.envelope.id != upcoming.prefix(6).last?.envelope.id {
                        Divider().overlay(Palette.separator)
                    }
                }
            }
            .card()
        }
    }

    private func shiftMonth(by offset: Int) {
        guard let next = Calendar.current.date(byAdding: .month, value: offset, to: visibleMonth) else {
            return
        }
        withAnimation(Theme.Motion.value) { visibleMonth = next }
    }
}

/// Which envelopes count against a spend-free day.
struct NoSpendSettingsSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Envelope.sortIndex) private var envelopes: [Envelope]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
                    Text("A day stays green as long as you don't spend from any envelope you mark off-limits. Bills are usually left on, so paying rent doesn't break a streak.")
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textSecondary)

                    VStack(spacing: 0) {
                        ForEach(envelopes.filter { !$0.isRetired }, id: \.id) { envelope in
                            Toggle(isOn: Binding(
                                get: { envelope.isOffLimitsForNoSpend },
                                set: { newValue in
                                    envelope.isOffLimitsForNoSpend = newValue
                                    BudgetStore(context: modelContext).save()
                                }
                            )) {
                                HStack(spacing: Theme.Spacing.small) {
                                    Text(envelope.emoji)
                                    Text(envelope.name)
                                        .font(Theme.Font.body)
                                        .foregroundStyle(Palette.textPrimary)
                                }
                            }
                            .tint(Palette.accent)
                            .padding(.vertical, Theme.Spacing.tight)

                            if envelope.id != envelopes.filter({ !$0.isRetired }).last?.id {
                                Divider().overlay(Palette.separator)
                            }
                        }
                    }
                    .card()
                }
                .padding(Theme.Spacing.screenMargin)
            }
            .background(Palette.background)
            .navigationTitle("Spend-free days")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Palette.accent)
                }
            }
        }
    }
}

#Preview {
    OverviewCalendarView()
        .environment(AppRoute())
        .modelContainer(AppModelContainer.makePreview())
}
