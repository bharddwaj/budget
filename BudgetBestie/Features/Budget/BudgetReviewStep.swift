import SwiftUI
import BudgetKit

/// Step 4 — one last look before the budget is committed.
///
/// "create budget" stays disabled while anything is still unplaced, because a
/// budget that doesn't add up is the one thing this flow exists to prevent.
struct BudgetReviewStep: View {
    @Bindable var model: BudgetFlowModel
    var onCreate: () -> Void

    var body: some View {
        BudgetStepScaffold(
            title: "Look good?",
            subtitle: "Tap any envelope to change it."
        ) {
            totalsCard

            ForEach(EnvelopeKind.displayOrder, id: \.self) { kind in
                section(for: kind)
            }

            if !model.isFullyAllocated {
                unallocatedWarning
            }
        } actions: {
            PillButton(title: "create budget", isEnabled: model.isFullyAllocated) {
                onCreate()
            }
            PillButton(title: "previous", style: .quiet) {
                model.step = .allocate
            }
        }
    }

    private var totalsCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            HStack {
                Text("you have")
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(amount: model.totalCash, font: Theme.Font.headline)
            }
            Divider().overlay(Palette.separator)
            HStack {
                Text("you're stuffing")
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(amount: model.allocatedTotal, font: Theme.Font.headline)
            }
            Divider().overlay(Palette.separator)
            HStack {
                Text("left over")
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(
                    amount: model.remaining,
                    font: Theme.Font.headline,
                    color: model.isFullyAllocated ? Palette.positive : Palette.negative
                )
            }
            Divider().overlay(Palette.separator)
            HStack {
                Text("next budget")
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                Text(model.nextBudgetDate.formatted(.dateTime.weekday(.abbreviated).month().day()))
                    .font(Theme.Font.headline)
                    .foregroundStyle(Palette.textPrimary)
            }
        }
        .card()
    }

    @ViewBuilder
    private func section(for kind: EnvelopeKind) -> some View {
        let group = model.envelopes.enumerated().filter { $0.element.kind == kind }

        if !group.isEmpty {
            VStack(alignment: .leading, spacing: Theme.Spacing.small) {
                SectionHeader(
                    title: kind.sectionTitle,
                    tint: kind.color,
                    trailing: nil
                )
                VStack(spacing: 0) {
                    ForEach(Array(group), id: \.element.id) { index, envelope in
                        Button {
                            model.commitCurrent(model.target(for: envelope), thenJumpTo: index)
                        } label: {
                            reviewRow(envelope)
                        }
                        .buttonStyle(.plain)

                        if envelope.id != group.last?.element.id {
                            Divider().overlay(Palette.separator)
                        }
                    }
                }
                .card()
            }
        }
    }

    private func reviewRow(_ envelope: Envelope) -> some View {
        let delta = model.delta(for: envelope)
        return HStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(emoji: envelope.emoji, tint: envelope.kind.color, size: 38)

            VStack(alignment: .leading, spacing: 2) {
                Text(envelope.name)
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textPrimary)
                if !delta.isZero {
                    AmountText(
                        amount: delta,
                        font: Theme.Font.caption,
                        showsSign: true,
                        colorBySign: true
                    )
                } else {
                    Text("unchanged")
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.textSecondary)
                }
            }

            Spacer()
            AmountText(amount: model.target(for: envelope), font: Theme.Font.headline)
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Palette.separator)
        }
        .padding(.vertical, Theme.Spacing.small)
        .contentShape(Rectangle())
    }

    private var unallocatedWarning: some View {
        HStack(alignment: .top, spacing: Theme.Spacing.small) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Palette.warning)
            Text("Every dollar needs a home before you can create this budget. Head back and keep stuffing.")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
        }
        .card(background: Palette.warning.opacity(0.12))
    }
}
