import SwiftUI
import SwiftData
import BudgetKit

/// The `+` sheet: amount, expense or income, an optional description, a date and
/// an envelope. Doubles as the edit screen when handed an existing transaction.
struct TransactionEditorSheet: View {
    var editing: Transaction?

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \Envelope.sortIndex) private var allEnvelopes: [Envelope]

    @State private var engine = KeypadEngine()
    @State private var kind: TransactionKind = .expense
    @State private var note = ""
    @State private var date = Date()
    @State private var envelope: Envelope?
    @State private var recurrence: RecurrenceRule = .none
    @State private var hasLoaded = false

    private var envelopes: [Envelope] {
        allEnvelopes.filter { !$0.isRetired }
    }

    private var isValid: Bool {
        envelope != nil && engine.value.isPositive
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.large) {
                    KeypadDisplay(engine: engine, caption: nil)
                        .padding(.top, Theme.Spacing.small)

                    kindPicker
                    BudgetKeypad(engine: $engine, suggested: nil, showsEmpty: false)
                    detailsCard
                    envelopePicker
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.bottom, 100)
            }
            .background(Palette.background)
            .safeAreaInset(edge: .bottom) {
                PillButton(
                    title: editing == nil ? "Add Transaction" : "Save changes",
                    isEnabled: isValid
                ) {
                    submit()
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.small)
                .background(.ultraThinMaterial)
            }
            .navigationTitle(editing == nil ? "New transaction" : "Edit transaction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
                if editing != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(role: .destructive) {
                            deleteTransaction()
                        } label: {
                            Image(systemName: "trash")
                        }
                        .tint(Palette.negative)
                    }
                }
            }
            .onAppear(perform: loadIfNeeded)
        }
    }

    // MARK: - Pieces

    private var kindPicker: some View {
        HStack(spacing: Theme.Spacing.small) {
            ForEach(TransactionKind.userSelectable) { candidate in
                Button {
                    kind = candidate
                } label: {
                    HStack(spacing: Theme.Spacing.tight) {
                        Image(systemName: candidate.symbolName)
                        Text(candidate.title)
                    }
                    .font(Theme.Font.body)
                    .foregroundStyle(kind == candidate ? Palette.textOnAccent : Palette.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(kind == candidate ? tint(for: candidate) : Palette.surfaceMuted)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .animation(Theme.Motion.value, value: kind)
    }

    private func tint(for kind: TransactionKind) -> Color {
        kind == .income ? Palette.positive : Palette.accent
    }

    private var detailsCard: some View {
        VStack(spacing: Theme.Spacing.medium) {
            HStack {
                Text("Description")
                    .font(Theme.Font.callout)
                    .foregroundStyle(Palette.textSecondary)
                Spacer()
                TextField("optional", text: $note)
                    .font(Theme.Font.body)
                    .multilineTextAlignment(.trailing)
                    .textInputAutocapitalization(.sentences)
            }

            Divider().overlay(Palette.separator)

            DatePicker(
                "When",
                selection: $date,
                displayedComponents: .date
            )
            .font(Theme.Font.callout)
            .tint(Palette.accent)

            Divider().overlay(Palette.separator)

            Picker("Repeats", selection: $recurrence) {
                ForEach(RecurrenceRule.allCases) { rule in
                    Text(rule.title).tag(rule)
                }
            }
            .font(Theme.Font.callout)
            .tint(Palette.accent)
        }
        .card()
    }

    private var envelopePicker: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "Which envelope?")

            if envelopes.isEmpty {
                Text("Create an envelope first — every transaction belongs to one.")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                    .card()
            } else {
                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 110), spacing: Theme.Spacing.small)],
                    spacing: Theme.Spacing.small
                ) {
                    ForEach(envelopes, id: \.id) { candidate in
                        Button {
                            envelope = candidate
                        } label: {
                            HStack(spacing: Theme.Spacing.tight) {
                                Text(candidate.emoji)
                                Text(candidate.name)
                                    .font(Theme.Font.caption)
                                    .lineLimit(1)
                            }
                            .foregroundStyle(
                                envelope?.id == candidate.id
                                    ? Palette.textOnAccent
                                    : Palette.textPrimary
                            )
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                envelope?.id == candidate.id
                                    ? candidate.kind.color
                                    : Palette.surface
                            )
                            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.chip, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Behaviour

    private func loadIfNeeded() {
        guard !hasLoaded else { return }
        hasLoaded = true

        guard let editing else {
            envelope = envelopes.first
            return
        }
        engine.reset(to: editing.amount)
        kind = editing.kind == .income ? .income : .expense
        note = editing.note
        date = editing.date
        envelope = editing.envelope
        recurrence = editing.recurrence
    }

    private func submit() {
        guard let envelope else { return }
        let amount = engine.commit()
        guard amount.isPositive else { return }

        let store = BudgetStore(context: modelContext)
        if let editing {
            store.update(
                editing,
                amount: amount,
                kind: kind,
                note: note,
                date: date,
                envelope: envelope,
                recurrence: recurrence
            )
        } else {
            store.record(
                amount: amount,
                kind: kind,
                note: note,
                date: date,
                envelope: envelope,
                recurrence: recurrence
            )
        }
        dismiss()
    }

    private func deleteTransaction() {
        guard let editing else { return }
        BudgetStore(context: modelContext).delete(editing)
        dismiss()
    }
}

#Preview {
    TransactionEditorSheet(editing: nil)
        .modelContainer(AppModelContainer.makePreview())
}
