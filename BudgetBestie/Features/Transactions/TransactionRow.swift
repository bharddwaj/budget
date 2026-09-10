import SwiftUI
import BudgetKit

/// One line in the ledger.
struct TransactionRow: View {
    var transaction: Transaction
    /// Hide the envelope name on an envelope's own detail screen, where it is
    /// the same for every row.
    var showsEnvelope: Bool = true

    var body: some View {
        HStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(
                emoji: transaction.envelope?.emoji ?? "💸",
                tint: transaction.envelope?.kind.color ?? Palette.accent,
                size: 38
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.displayTitle)
                    .font(Theme.Font.body)
                    .foregroundStyle(Palette.textPrimary)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if showsEnvelope, let envelope = transaction.envelope {
                        Text(envelope.name)
                    }
                    if transaction.kind != .expense {
                        Text(transaction.kind.title)
                    }
                    if transaction.isRecurring {
                        Image(systemName: "repeat")
                    }
                }
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
                .lineLimit(1)
            }

            Spacer()

            AmountText(
                amount: transaction.signedAmount,
                font: Theme.Font.headline,
                showsSign: true,
                colorBySign: true
            )
        }
        .padding(.vertical, Theme.Spacing.small)
        .contentShape(Rectangle())
    }
}

#Preview {
    let container = AppModelContainer.makePreview()
    let store = BudgetStore(context: container.mainContext)
    return VStack(spacing: 0) {
        ForEach(store.transactions().prefix(6), id: \.id) { transaction in
            TransactionRow(transaction: transaction)
        }
    }
    .padding(Theme.Spacing.medium)
    .background(Palette.surface)
    .modelContainer(container)
}
