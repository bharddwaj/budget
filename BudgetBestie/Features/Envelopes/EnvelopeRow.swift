import SwiftUI
import BudgetKit

/// One envelope in the home list: emoji, name, what's left, and a bar showing
/// how much of this budget's stuffing has been spent.
struct EnvelopeRow: View {
    var envelope: Envelope
    var cycle: BudgetCycle?

    @Environment(\.currencyFormat) private var format

    var body: some View {
        HStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(emoji: envelope.emoji, tint: envelope.kind.color)

            VStack(alignment: .leading, spacing: Theme.Spacing.tight) {
                HStack {
                    Text(envelope.name)
                        .font(Theme.Font.body)
                        .foregroundStyle(Palette.textPrimary)
                        .lineLimit(1)
                    Spacer()
                    AmountText(
                        amount: envelope.balance,
                        font: Theme.Font.headline,
                        color: envelope.balance.isNegative ? Palette.negative : Palette.textPrimary
                    )
                }

                ProgressTrack(progress: progress, tint: envelope.kind.color)

                if let subtitle {
                    Text(subtitle)
                        .font(Theme.Font.caption)
                        .foregroundStyle(subtitleColor)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, Theme.Spacing.small)
        .contentShape(Rectangle())
    }

    private var progress: Double {
        switch envelope.kind {
        case .savings:
            return envelope.goalProgress ?? 0
        case .variable, .fixed:
            return envelope.spentFraction(in: cycle)
        }
    }

    /// The line under the bar changes with the envelope's job: what's left to
    /// spend, when the bill is due, or how far along the goal is.
    private var subtitle: String? {
        switch envelope.kind {
        case .variable:
            let stuffed = envelope.stuffed(in: cycle)
            guard stuffed.isPositive else { return nil }
            let spent = (stuffed - envelope.balance).clampedToZero
            return "\(format.string(from: spent)) of \(format.string(from: stuffed)) spent"

        case .fixed:
            guard let due = envelope.billDueDate else { return nil }
            if envelope.isBillOutstanding() {
                return "Due \(due.formatted(.dateTime.month().day())) — not paid yet"
            }
            return "Due \(due.formatted(.dateTime.month().day()))"

        case .savings:
            guard let goal = envelope.goalAmount, goal.isPositive else { return nil }
            let remaining = (goal - envelope.balance).clampedToZero
            if remaining.isZero { return "Goal reached 🎉" }
            return "\(format.string(from: remaining)) to go"
        }
    }

    private var subtitleColor: Color {
        envelope.kind == .fixed && envelope.isBillOutstanding()
            ? Palette.warning
            : Palette.textSecondary
    }
}

#Preview {
    let container = AppModelContainer.makePreview()
    let store = BudgetStore(context: container.mainContext)
    return VStack(spacing: 0) {
        ForEach(store.envelopes().prefix(6), id: \.id) { envelope in
            EnvelopeRow(envelope: envelope, cycle: store.activeCycle())
        }
    }
    .padding(Theme.Spacing.medium)
    .background(Palette.surface)
    .modelContainer(container)
}
