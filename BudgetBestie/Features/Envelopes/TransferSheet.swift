import SwiftUI
import SwiftData
import BudgetKit

/// Moves money from one envelope to another — what you reach for when groceries
/// runs dry and fun money hasn't.
struct TransferSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Environment(\.currencyFormat) private var format

    @Query(sort: \Envelope.sortIndex) private var allEnvelopes: [Envelope]

    @State private var engine = KeypadEngine()
    @State private var source: Envelope?
    @State private var destination: Envelope?
    @State private var date = Date()

    private var envelopes: [Envelope] {
        allEnvelopes.filter { !$0.isRetired }
    }

    private var isValid: Bool {
        guard let source, let destination else { return false }
        return source.id != destination.id && engine.value.isPositive
    }

    /// Warns rather than blocks: pulling an envelope negative is allowed, since
    /// real life sometimes gets there before the next budget does.
    private var overdrawWarning: String? {
        guard let source, engine.value > source.balance else { return nil }
        return "\(source.name) only has \(format.string(from: source.balance)) — this will take it negative."
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.large) {
                    KeypadDisplay(engine: engine, caption: overdrawWarning)
                        .padding(.top, Theme.Spacing.small)

                    BudgetKeypad(engine: $engine, suggested: nil, showsEmpty: false)

                    picker(title: "From", selection: $source, exclude: destination)
                    picker(title: "To", selection: $destination, exclude: source)

                    DatePicker("When", selection: $date, displayedComponents: .date)
                        .font(Theme.Font.callout)
                        .tint(Palette.accent)
                        .card()
                }
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.bottom, 100)
            }
            .background(Palette.background)
            .safeAreaInset(edge: .bottom) {
                PillButton(title: "transfer", isEnabled: isValid) { submit() }
                    .padding(.horizontal, Theme.Spacing.screenMargin)
                    .padding(.vertical, Theme.Spacing.small)
                    .background(.ultraThinMaterial)
            }
            .navigationTitle("Move money")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
            }
        }
    }

    private func picker(
        title: String,
        selection: Binding<Envelope?>,
        exclude: Envelope?
    ) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: title)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.small) {
                    ForEach(envelopes.filter { $0.id != exclude?.id }, id: \.id) { candidate in
                        Button {
                            selection.wrappedValue = candidate
                        } label: {
                            VStack(spacing: 4) {
                                Text(candidate.emoji)
                                    .font(.system(size: 20))
                                Text(candidate.name)
                                    .font(Theme.Font.caption)
                                    .lineLimit(1)
                            }
                            .foregroundStyle(
                                selection.wrappedValue?.id == candidate.id
                                    ? Palette.textOnAccent
                                    : Palette.textPrimary
                            )
                            .frame(width: 84, height: 68)
                            .background(
                                selection.wrappedValue?.id == candidate.id
                                    ? candidate.kind.color
                                    : Palette.surface
                            )
                            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.chip, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func submit() {
        guard let source, let destination else { return }
        BudgetStore(context: modelContext).transfer(
            engine.commit(),
            from: source,
            to: destination,
            date: date
        )
        dismiss()
    }
}

#Preview {
    TransferSheet()
        .modelContainer(AppModelContainer.makePreview())
}
