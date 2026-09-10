import SwiftUI
import SwiftData
import BudgetKit

/// Create or edit an envelope: pick an emoji, name it, choose a stuffing method,
/// then fill in whatever that method needs.
struct EnvelopeEditorSheet: View {
    var editing: Envelope?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var emoji = "🛒"
    @State private var name = ""
    @State private var kind: EnvelopeKind = .variable
    @State private var billAmount: Money = .zero
    @State private var billDueDate = Date()
    @State private var billRecurrence: RecurrenceRule = .monthly
    @State private var goalAmount: Money = .zero
    @State private var hasDeadline = false
    @State private var goalDeadline = Date()
    @State private var isOffLimits = true

    @State private var isEditingBillAmount = false
    @State private var isEditingGoalAmount = false
    @State private var hasLoaded = false

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && requiredFieldsFilled
    }

    /// Each stuffing method has its own required field, mirroring the prompts
    /// the real app walks you through after you pick a type.
    private var requiredFieldsFilled: Bool {
        switch kind {
        case .variable: return true
        case .fixed: return billAmount.isPositive
        case .savings: return goalAmount.isPositive
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.large) {
                    identityCard
                    typePicker
                    kindDetails
                    noSpendCard

                    if editing != nil {
                        dangerZone
                    }
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.bottom, 100)
            }
            .background(Palette.background)
            .safeAreaInset(edge: .bottom) {
                PillButton(title: "save", isEnabled: isValid) { save() }
                    .padding(.horizontal, Theme.Spacing.screenMargin)
                    .padding(.vertical, Theme.Spacing.small)
                    .background(.ultraThinMaterial)
            }
            .navigationTitle(editing == nil ? "New envelope" : "Edit envelope")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
            }
            .onAppear(perform: loadIfNeeded)
            .sheet(isPresented: $isEditingBillAmount) {
                AmountEntrySheet(
                    title: "How much is the bill?",
                    caption: "An estimate is fine — you can change it later.",
                    amount: $billAmount
                )
            }
            .sheet(isPresented: $isEditingGoalAmount) {
                AmountEntrySheet(
                    title: "What's your goal?",
                    amount: $goalAmount
                )
            }
        }
    }

    // MARK: - Pieces

    private var identityCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            HStack(spacing: Theme.Spacing.medium) {
                EmojiBadge(emoji: emoji, tint: kind.color, size: 56)
                TextField("Name it", text: $name)
                    .font(Theme.Font.headline)
                    .textInputAutocapitalization(.words)
            }
            Divider().overlay(Palette.separator)
            EmojiPicker(selection: $emoji)
        }
        .card()
    }

    private var typePicker: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Stuffing method")
            ForEach(EnvelopeKind.allCases) { candidate in
                Button {
                    kind = candidate
                } label: {
                    HStack(alignment: .top, spacing: Theme.Spacing.medium) {
                        Image(systemName: candidate.symbolName)
                            .foregroundStyle(candidate.color)
                            .frame(width: 24)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(candidate.title)
                                .font(Theme.Font.body)
                                .foregroundStyle(Palette.textPrimary)
                            Text(candidate.blurb)
                                .font(Theme.Font.caption)
                                .foregroundStyle(Palette.textSecondary)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer()
                        Image(systemName: kind == candidate ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(kind == candidate ? candidate.color : Palette.separator)
                    }
                    .padding(.vertical, Theme.Spacing.small)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if candidate != EnvelopeKind.allCases.last {
                    Divider().overlay(Palette.separator)
                }
            }
        }
        .card()
        .animation(Theme.Motion.value, value: kind)
    }

    @ViewBuilder
    private var kindDetails: some View {
        switch kind {
        case .variable:
            HStack(alignment: .top, spacing: Theme.Spacing.small) {
                Image(systemName: "sparkles").foregroundStyle(Palette.accent)
                Text("We'll suggest an amount once you've spent here a few times, based on your last 3 months.")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
            }
            .card(background: Palette.surfaceMuted)

        case .fixed:
            VStack(spacing: Theme.Spacing.medium) {
                amountRow(
                    label: "Bill amount",
                    amount: billAmount,
                    action: { isEditingBillAmount = true }
                )
                Divider().overlay(Palette.separator)
                DatePicker("Next due", selection: $billDueDate, displayedComponents: .date)
                    .font(Theme.Font.callout)
                    .tint(Palette.accent)
                Divider().overlay(Palette.separator)
                Picker("Repeats", selection: $billRecurrence) {
                    ForEach(RecurrenceRule.allCases.filter { $0 != .none }) { rule in
                        Text(rule.title).tag(rule)
                    }
                }
                .font(Theme.Font.callout)
                .tint(Palette.accent)
            }
            .card()

        case .savings:
            VStack(spacing: Theme.Spacing.medium) {
                amountRow(
                    label: "Goal amount",
                    amount: goalAmount,
                    action: { isEditingGoalAmount = true }
                )
                Divider().overlay(Palette.separator)
                Toggle("Set a deadline", isOn: $hasDeadline)
                    .font(Theme.Font.callout)
                    .tint(Palette.accent)
                if hasDeadline {
                    DatePicker("By", selection: $goalDeadline, displayedComponents: .date)
                        .font(Theme.Font.callout)
                        .tint(Palette.accent)
                }
            }
            .card()
        }
    }

    private var noSpendCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.tight) {
            Toggle("Spending here breaks a spend-free day", isOn: $isOffLimits)
                .font(Theme.Font.callout)
                .tint(Palette.accent)
            Text("Bills are usually left on, so paying rent doesn't ruin a streak.")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
        }
        .card()
    }

    private var dangerZone: some View {
        VStack(spacing: Theme.Spacing.small) {
            if let editing {
                PillButton(
                    title: editing.isRetired ? "unretire envelope" : "retire envelope",
                    style: .secondary
                ) {
                    let store = BudgetStore(context: modelContext)
                    editing.isRetired ? store.unretire(editing) : store.retire(editing)
                    dismiss()
                }
                PillButton(title: "delete envelope", style: .destructive) {
                    BudgetStore(context: modelContext).delete(editing)
                    dismiss()
                }
                Text("Retiring keeps your history; deleting removes it for good.")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private func amountRow(label: String, amount: Money, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(label)
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                AmountText(amount: amount, font: Theme.Font.headline)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.separator)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Behaviour

    private func loadIfNeeded() {
        guard !hasLoaded else { return }
        hasLoaded = true

        guard let editing else { return }
        emoji = editing.emoji
        name = editing.name
        kind = editing.kind
        billAmount = editing.billAmount ?? .zero
        billDueDate = editing.billDueDate ?? Date()
        billRecurrence = editing.billRecurrence
        goalAmount = editing.goalAmount ?? .zero
        hasDeadline = editing.goalDeadline != nil
        goalDeadline = editing.goalDeadline ?? Date()
        isOffLimits = editing.isOffLimitsForNoSpend
    }

    private func save() {
        let store = BudgetStore(context: modelContext)
        let envelope: Envelope

        if let editing {
            store.changeKind(of: editing, to: kind)
            envelope = editing
        } else {
            envelope = store.createEnvelope(emoji: emoji, name: name, kind: kind)
        }

        envelope.emoji = emoji
        envelope.name = name.trimmingCharacters(in: .whitespaces)
        envelope.isOffLimitsForNoSpend = isOffLimits

        switch kind {
        case .variable:
            break
        case .fixed:
            envelope.billAmount = billAmount
            envelope.billDueDate = billDueDate
            envelope.billRecurrence = billRecurrence
        case .savings:
            envelope.goalAmount = goalAmount
            envelope.goalDeadline = hasDeadline ? goalDeadline : nil
        }

        store.save()
        dismiss()
    }
}

#Preview {
    EnvelopeEditorSheet(editing: nil)
        .modelContainer(AppModelContainer.makePreview())
}
