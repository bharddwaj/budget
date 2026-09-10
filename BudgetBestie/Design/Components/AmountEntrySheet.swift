import SwiftUI
import BudgetKit

/// A small keypad sheet for editing one amount — used for reconciling your cash
/// total, setting a bill amount, and entering a savings goal.
struct AmountEntrySheet: View {
    var title: String
    var caption: String?
    @Binding var amount: Money
    var onDone: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var engine: KeypadEngine

    init(
        title: String,
        caption: String? = nil,
        amount: Binding<Money>,
        onDone: (() -> Void)? = nil
    ) {
        self.title = title
        self.caption = caption
        self._amount = amount
        self.onDone = onDone
        self._engine = State(initialValue: KeypadEngine(value: amount.wrappedValue))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Spacing.large) {
                KeypadDisplay(engine: engine, caption: caption)
                    .padding(.top, Theme.Spacing.large)

                BudgetKeypad(engine: $engine, suggested: nil, showsEmpty: false)

                Spacer(minLength: 0)

                PillButton(title: "done") {
                    amount = engine.commit()
                    onDone?()
                    dismiss()
                }
            }
            .padding(.horizontal, Theme.Spacing.screenMargin)
            .padding(.bottom, Theme.Spacing.medium)
            .background(Palette.background)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
            }
        }
        .presentationDetents([.large])
    }
}

#Preview {
    struct Harness: View {
        @State private var amount = Money(major: 2400)
        var body: some View {
            AmountEntrySheet(
                title: "How much do you have?",
                caption: "Add up every bank account and any cash.",
                amount: $amount
            )
        }
    }
    return Harness()
}
