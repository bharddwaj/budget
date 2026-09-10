import SwiftUI
import SwiftData
import BudgetKit

/// First run: what the app is, how often you get paid, a starter set of
/// envelopes, and how much you have. It ends by dropping you straight into your
/// first budget, which is the only way the rest of the app makes sense.
struct OnboardingFlow: View {
    @Environment(\.modelContext) private var modelContext

    @State private var page = 0
    @State private var frequency: BudgetFrequency = .biweekly
    @State private var selectedStarters: Set<String> = Set(StarterEnvelope.defaults.map(\.name))
    @State private var totalCash: Money = .zero
    @State private var isEditingCash = false
    @State private var isBudgeting = false

    private let pageCount = 4

    var body: some View {
        VStack(spacing: 0) {
            ProgressTrack(progress: Double(page + 1) / Double(pageCount), tint: Palette.accent)
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.top, Theme.Spacing.medium)

            TabView(selection: $page) {
                welcomePage.tag(0)
                frequencyPage.tag(1)
                envelopesPage.tag(2)
                cashPage.tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(Theme.Motion.sheet, value: page)

            VStack(spacing: Theme.Spacing.small) {
                PillButton(title: page == pageCount - 1 ? "let's budget" : "next") {
                    if page == pageCount - 1 {
                        finish()
                    } else {
                        page += 1
                    }
                }
                if page > 0 {
                    PillButton(title: "back", style: .quiet) { page -= 1 }
                }
            }
            .padding(.horizontal, Theme.Spacing.screenMargin)
            .padding(.bottom, Theme.Spacing.medium)
        }
        .background(Palette.background)
        .sheet(isPresented: $isEditingCash) {
            AmountEntrySheet(
                title: "How much do you have?",
                caption: "Every bank account, plus any cash.",
                amount: $totalCash
            )
        }
        .fullScreenCover(isPresented: $isBudgeting) {
            BudgetFlowView()
        }
    }

    // MARK: - Pages

    private var welcomePage: some View {
        page(
            emoji: "💌",
            title: "Cash stuffing, without the cash",
            body: "Give every dollar a job by putting it into an envelope. Spend from the envelope, and when it's empty, it's empty."
        ) {
            VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
                bullet("🛒", "Variable envelopes for costs that move around.")
                bullet("🏠", "Fixed envelopes for bills, with reminders.")
                bullet("🛟", "Savings envelopes for the things you're working toward.")
            }
            .card()
        }
    }

    private var frequencyPage: some View {
        page(
            emoji: "🗓️",
            title: "How often do you get paid?",
            body: "This becomes your budget rhythm. You can change it any time."
        ) {
            VStack(spacing: 0) {
                ForEach(BudgetFrequency.allCases) { candidate in
                    Button {
                        frequency = candidate
                    } label: {
                        HStack {
                            Text(candidate.title)
                                .font(Theme.Font.body)
                                .foregroundStyle(Palette.textPrimary)
                            Spacer()
                            Image(systemName: frequency == candidate
                                  ? "checkmark.circle.fill"
                                  : "circle")
                                .foregroundStyle(frequency == candidate ? Palette.accent : Palette.separator)
                        }
                        .padding(.vertical, Theme.Spacing.small)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    if candidate != BudgetFrequency.allCases.last {
                        Divider().overlay(Palette.separator)
                    }
                }
            }
            .card()
        }
    }

    private var envelopesPage: some View {
        page(
            emoji: "🧧",
            title: "Pick your starting envelopes",
            body: "Just enough to get going — you can add, rename and delete them later."
        ) {
            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 150), spacing: Theme.Spacing.small)],
                spacing: Theme.Spacing.small
            ) {
                ForEach(StarterEnvelope.defaults) { starter in
                    Button {
                        toggle(starter)
                    } label: {
                        HStack(spacing: Theme.Spacing.small) {
                            Text(starter.emoji)
                            Text(starter.name)
                                .font(Theme.Font.caption)
                                .lineLimit(1)
                            Spacer()
                            Image(systemName: selectedStarters.contains(starter.name)
                                  ? "checkmark.circle.fill"
                                  : "circle")
                                .font(.system(size: 14))
                        }
                        .foregroundStyle(
                            selectedStarters.contains(starter.name)
                                ? Palette.textOnAccent
                                : Palette.textPrimary
                        )
                        .padding(.horizontal, Theme.Spacing.small)
                        .frame(height: 46)
                        .background(
                            selectedStarters.contains(starter.name)
                                ? starter.kind.color
                                : Palette.surface
                        )
                        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.chip, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var cashPage: some View {
        page(
            emoji: "💰",
            title: "How much do you have right now?",
            body: "Add up your accounts and any cash. This is what you'll be stuffing."
        ) {
            Button {
                isEditingCash = true
            } label: {
                VStack(spacing: Theme.Spacing.small) {
                    AmountText(amount: totalCash, font: Theme.Font.hero)
                    Text("tap to enter")
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.accent)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Theme.Spacing.large)
                .card(background: Palette.accentSoft)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Layout

    private func page<Content: View>(
        emoji: String,
        title: String,
        body: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.large) {
                Text(emoji).font(.system(size: 48))
                VStack(alignment: .leading, spacing: Theme.Spacing.small) {
                    Text(title)
                        .font(Theme.Font.title)
                        .foregroundStyle(Palette.textPrimary)
                    Text(body)
                        .font(Theme.Font.callout)
                        .foregroundStyle(Palette.textSecondary)
                }
                content()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Theme.Spacing.screenMargin)
            .padding(.vertical, Theme.Spacing.large)
        }
    }

    private func bullet(_ emoji: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Spacing.small) {
            Text(emoji)
            Text(text)
                .font(Theme.Font.callout)
                .foregroundStyle(Palette.textSecondary)
        }
    }

    // MARK: - Behaviour

    private func toggle(_ starter: StarterEnvelope) {
        if selectedStarters.contains(starter.name) {
            selectedStarters.remove(starter.name)
        } else {
            selectedStarters.insert(starter.name)
        }
    }

    /// Creates the chosen envelopes, marks onboarding done, and opens the budget
    /// flow so the first stuffing happens immediately.
    private func finish() {
        let store = BudgetStore(context: modelContext)

        for starter in StarterEnvelope.defaults where selectedStarters.contains(starter.name) {
            let envelope = store.createEnvelope(
                emoji: starter.emoji,
                name: starter.name,
                kind: starter.kind
            )
            // The first budget's "you have" total starts from envelope balances,
            // so seed one envelope with the cash the user just entered and let
            // them redistribute it in the flow.
            if starter.name == StarterEnvelope.defaults.first?.name {
                envelope.balance = totalCash
            }
        }

        let settings = store.settings()
        settings.hasOnboarded = true
        settings.noSpendTrackingStart = Date()
        store.save()

        isBudgeting = true
    }
}

/// The starter envelopes offered during onboarding.
struct StarterEnvelope: Identifiable {
    var emoji: String
    var name: String
    var kind: EnvelopeKind

    var id: String { name }

    static let defaults: [StarterEnvelope] = [
        StarterEnvelope(emoji: "🛒", name: "Groceries", kind: .variable),
        StarterEnvelope(emoji: "⛽️", name: "Gas", kind: .variable),
        StarterEnvelope(emoji: "🍜", name: "Eating out", kind: .variable),
        StarterEnvelope(emoji: "🎀", name: "Fun money", kind: .variable),
        StarterEnvelope(emoji: "🏠", name: "Rent", kind: .fixed),
        StarterEnvelope(emoji: "📱", name: "Phone", kind: .fixed),
        StarterEnvelope(emoji: "💡", name: "Utilities", kind: .fixed),
        StarterEnvelope(emoji: "🛟", name: "Emergency fund", kind: .savings)
    ]
}

#Preview {
    OnboardingFlow()
        .modelContainer(AppModelContainer.makeInMemory())
}
