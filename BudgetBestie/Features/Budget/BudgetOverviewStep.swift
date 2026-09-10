import SwiftUI
import BudgetKit

/// Step 1 — what happened since your last budget, and how much you have now.
///
/// The "you have" total is editable here on purpose: this is where the app is
/// reconciled against real bank balances, so the stuffing that follows is based
/// on money that actually exists.
struct BudgetOverviewStep: View {
    @Bindable var model: BudgetFlowModel
    @State private var isEditingTotal = false

    var body: some View {
        BudgetStepScaffold(
            title: "Let's look at your money",
            subtitle: "Check this matches your accounts before you stuff anything."
        ) {
            if let previous = model.previousCycle {
                sinceLastBudgetCard(previous: previous)
            }
            totalCard
            reconcileHint
        } actions: {
            PillButton(title: "stuff your money") {
                model.advance()
            }
        }
        .sheet(isPresented: $isEditingTotal) {
            AmountEntrySheet(
                title: "How much do you have?",
                caption: "Every bank account, plus any cash in your wallet.",
                amount: $model.totalCash
            )
        }
    }

    private func sinceLastBudgetCard(previous: BudgetCycle) -> some View {
        VStack(spacing: Theme.Spacing.medium) {
            SectionHeader(title: "Since your last budget")

            summaryRow(
                emoji: "🗓️",
                label: "You started with",
                amount: previous.startingBalance,
                color: Palette.textPrimary
            )
            Divider().overlay(Palette.separator)
            summaryRow(
                emoji: "💸",
                label: "You spent",
                amount: model.spentSinceLastBudget,
                color: Palette.negative
            )
            Divider().overlay(Palette.separator)
            summaryRow(
                emoji: "💰",
                label: "You made",
                amount: model.incomeSinceLastBudget,
                color: Palette.positive
            )
        }
        .card()
    }

    private var totalCard: some View {
        Button {
            isEditingTotal = true
        } label: {
            VStack(spacing: Theme.Spacing.small) {
                Text("you have")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: model.totalCash, font: Theme.Font.hero)
                HStack(spacing: 4) {
                    Image(systemName: "pencil")
                    Text("tap to correct")
                }
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.accent)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Spacing.medium)
            .card(padding: Theme.Spacing.large, background: Palette.accentSoft)
        }
        .buttonStyle(.plain)
    }

    private var reconcileHint: some View {
        HStack(alignment: .top, spacing: Theme.Spacing.small) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(Palette.accent)
            Text("If you missed logging something, close this and add it first — then this total will line up on its own.")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
        }
        .card(background: Palette.surfaceMuted)
    }

    private func summaryRow(
        emoji: String,
        label: String,
        amount: Money,
        color: Color
    ) -> some View {
        HStack(spacing: Theme.Spacing.small) {
            Text(emoji)
            Text(label)
                .font(Theme.Font.body)
                .foregroundStyle(Palette.textSecondary)
            Spacer()
            AmountText(amount: amount, font: Theme.Font.headline, color: color)
        }
    }
}
