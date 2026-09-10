import SwiftUI
import SwiftData
import BudgetKit

/// One envelope's page: what's in it, what it's for, its budget history, and its
/// ledger.
struct EnvelopeDetailView: View {
    var envelope: Envelope

    @Environment(\.modelContext) private var modelContext
    @Environment(AppRoute.self) private var route
    @Environment(\.currencyFormat) private var format
    @Environment(\.dismiss) private var dismiss

    @Query(filter: #Predicate<BudgetCycle> { $0.isActive }) private var activeCycles: [BudgetCycle]
    @State private var isMerging = false

    private var cycle: BudgetCycle? { activeCycles.first }

    private var history: [Allocation] {
        envelope.allocations.sorted { $0.createdAt > $1.createdAt }
    }

    private var ledger: [Transaction] {
        envelope.transactions.sorted { $0.date > $1.date }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Spacing.large) {
                headerCard
                purposeCard
                actionRow

                if !history.isEmpty {
                    historyCard
                }

                if !ledger.isEmpty {
                    ledgerCard
                }
            }
            .padding(.horizontal, Theme.Spacing.screenMargin)
            .padding(.vertical, Theme.Spacing.medium)
        }
        .background(Palette.background)
        .navigationTitle(envelope.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Edit envelope", systemImage: "pencil") {
                        route.edit(envelope)
                    }
                    Button("Merge into another", systemImage: "arrow.triangle.merge") {
                        isMerging = true
                    }
                    if envelope.isRetired {
                        Button("Unretire", systemImage: "arrow.uturn.backward") {
                            BudgetStore(context: modelContext).unretire(envelope)
                        }
                    } else {
                        Button("Retire", systemImage: "archivebox") {
                            BudgetStore(context: modelContext).retire(envelope)
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                }
            }
        }
        .sheet(isPresented: $isMerging) {
            MergeEnvelopeSheet(source: envelope) { dismiss() }
        }
    }

    // MARK: - Pieces

    private var headerCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(emoji: envelope.emoji, tint: envelope.kind.color, size: 64)

            VStack(spacing: 2) {
                Text("you have")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: envelope.balance, font: Theme.Font.hero)
            }

            if envelope.kind == .savings, let progress = envelope.goalProgress {
                ProgressTrack(progress: progress, tint: envelope.kind.color, height: 10)
                Text("\(Int(progress * 100))% of the way there")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
            } else if let stuffed = stuffedThisCycle {
                ProgressTrack(
                    progress: envelope.spentFraction(in: cycle),
                    tint: envelope.kind.color,
                    height: 10
                )
                Text("\(format.string(from: stuffed)) stuffed this budget")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
            }

            if envelope.isRetired {
                Text("Retired")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.warning)
            }
        }
        .card(padding: Theme.Spacing.large)
    }

    private var stuffedThisCycle: Money? {
        let stuffed = envelope.stuffed(in: cycle)
        return stuffed.isPositive ? stuffed : nil
    }

    @ViewBuilder
    private var purposeCard: some View {
        switch envelope.kind {
        case .variable:
            EmptyView()

        case .fixed:
            VStack(spacing: Theme.Spacing.small) {
                detailRow("Bill amount", value: format.string(from: envelope.billAmount ?? .zero))
                if let due = envelope.billDueDate {
                    Divider().overlay(Palette.separator)
                    detailRow("Next due", value: due.formatted(.dateTime.month().day().year()))
                }
                Divider().overlay(Palette.separator)
                detailRow("Repeats", value: envelope.billRecurrence.title)
                if envelope.isBillOutstanding() {
                    Divider().overlay(Palette.separator)
                    HStack(spacing: Theme.Spacing.tight) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundStyle(Palette.warning)
                        Text("This bill is due and hasn't been recorded as paid.")
                            .font(Theme.Font.caption)
                            .foregroundStyle(Palette.textSecondary)
                    }
                }
            }
            .card()

        case .savings:
            VStack(spacing: Theme.Spacing.small) {
                detailRow("Goal", value: format.string(from: envelope.goalAmount ?? .zero))
                Divider().overlay(Palette.separator)
                detailRow(
                    "Still to save",
                    value: format.string(
                        from: ((envelope.goalAmount ?? .zero) - envelope.balance).clampedToZero
                    )
                )
                if let deadline = envelope.goalDeadline {
                    Divider().overlay(Palette.separator)
                    detailRow("By", value: deadline.formatted(.dateTime.month().day().year()))
                }
            }
            .card()
        }
    }

    private var actionRow: some View {
        HStack(spacing: Theme.Spacing.small) {
            PillButton(title: "add", style: .secondary, icon: "plus") {
                route.addTransaction()
            }
            PillButton(title: "transfer", style: .secondary, icon: "arrow.left.arrow.right") {
                route.isTransferring = true
            }
        }
    }

    private var historyCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Budget history")
            VStack(spacing: 0) {
                ForEach(history.prefix(8), id: \.id) { allocation in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(allocation.createdAt.formatted(.dateTime.month().day().year()))
                                .font(Theme.Font.callout)
                                .foregroundStyle(Palette.textPrimary)
                            if !allocation.suggested.isZero {
                                Text("suggested \(format.string(from: allocation.suggested))")
                                    .font(Theme.Font.caption)
                                    .foregroundStyle(Palette.textSecondary)
                            }
                        }
                        Spacer()
                        AmountText(
                            amount: allocation.amount,
                            font: Theme.Font.headline,
                            showsSign: true,
                            colorBySign: true
                        )
                    }
                    .padding(.vertical, Theme.Spacing.small)

                    if allocation.id != history.prefix(8).last?.id {
                        Divider().overlay(Palette.separator)
                    }
                }
            }
            .card()
        }
    }

    private var ledgerCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Activity")
            VStack(spacing: 0) {
                ForEach(ledger.prefix(30), id: \.id) { transaction in
                    Button {
                        route.edit(transaction)
                    } label: {
                        TransactionRow(transaction: transaction, showsEnvelope: false)
                    }
                    .buttonStyle(.plain)

                    if transaction.id != ledger.prefix(30).last?.id {
                        Divider().overlay(Palette.separator)
                    }
                }
            }
            .card()
        }
    }

    private func detailRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(Theme.Font.callout)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            Text(value)
                .font(Theme.Font.headline)
                .foregroundStyle(Palette.textPrimary)
        }
    }
}

/// Folds one envelope into another, moving its money and its history across.
struct MergeEnvelopeSheet: View {
    var source: Envelope
    var onMerged: () -> Void

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Envelope.sortIndex) private var envelopes: [Envelope]

    @State private var destination: Envelope?

    private var candidates: [Envelope] {
        envelopes.filter { $0.id != source.id && !$0.isRetired }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
                    Text("Everything in \(source.emoji) \(source.name) — its balance and its whole history — moves into the envelope you pick, and this one goes away.")
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textSecondary)

                    VStack(spacing: 0) {
                        ForEach(candidates, id: \.id) { candidate in
                            Button {
                                destination = candidate
                            } label: {
                                HStack(spacing: Theme.Spacing.medium) {
                                    EmojiBadge(emoji: candidate.emoji, tint: candidate.kind.color, size: 38)
                                    Text(candidate.name)
                                        .font(Theme.Font.body)
                                        .foregroundStyle(Palette.textPrimary)
                                    Spacer()
                                    Image(systemName: destination?.id == candidate.id
                                          ? "checkmark.circle.fill"
                                          : "circle")
                                        .foregroundStyle(destination?.id == candidate.id
                                                         ? Palette.accent
                                                         : Palette.separator)
                                }
                                .padding(.vertical, Theme.Spacing.small)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)

                            if candidate.id != candidates.last?.id {
                                Divider().overlay(Palette.separator)
                            }
                        }
                    }
                    .card()
                }
                .padding(Theme.Spacing.screenMargin)
            }
            .background(Palette.background)
            .safeAreaInset(edge: .bottom) {
                PillButton(title: "merge", isEnabled: destination != nil) {
                    guard let destination else { return }
                    BudgetStore(context: modelContext).merge(source, into: destination)
                    dismiss()
                    onMerged()
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.small)
                .background(.ultraThinMaterial)
            }
            .navigationTitle("Merge envelope")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
            }
        }
    }
}

#Preview {
    let container = AppModelContainer.makePreview()
    let store = BudgetStore(context: container.mainContext)
    return NavigationStack {
        if let envelope = store.envelopes().first {
            EnvelopeDetailView(envelope: envelope)
        }
    }
    .environment(AppRoute())
    .modelContainer(container)
}
