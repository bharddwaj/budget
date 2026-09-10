import SwiftUI
import SwiftData
import BudgetKit

/// Drag to rearrange envelopes within their type group.
///
/// Ordering is per group rather than across the whole list, because the home
/// screen always shows variable, then fixed, then savings — moving a savings
/// envelope above groceries would have nowhere to land.
struct ArrangeEnvelopesSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \Envelope.sortIndex) private var allEnvelopes: [Envelope]
    @State private var showsRetired = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(EnvelopeKind.displayOrder, id: \.self) { kind in
                    let group = envelopes(of: kind)
                    if !group.isEmpty {
                        Section(kind.sectionTitle) {
                            ForEach(group, id: \.id) { envelope in
                                row(envelope)
                            }
                            .onMove { offsets, destination in
                                move(group, from: offsets, to: destination)
                            }
                        }
                    }
                }

                if !retired.isEmpty {
                    Section {
                        if showsRetired {
                            ForEach(retired, id: \.id) { envelope in
                                HStack {
                                    row(envelope)
                                    Spacer()
                                    Button("Unretire") {
                                        BudgetStore(context: modelContext).unretire(envelope)
                                    }
                                    .font(Theme.Font.caption)
                                    .foregroundStyle(Palette.accent)
                                }
                            }
                        }
                    } header: {
                        Button(showsRetired ? "Hide retired" : "Show retired (\(retired.count))") {
                            withAnimation { showsRetired.toggle() }
                        }
                        .font(Theme.Font.caption)
                        .foregroundStyle(Palette.accent)
                    }
                }
            }
            .environment(\.editMode, .constant(.active))
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle("Arrange envelopes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Palette.accent)
                }
            }
        }
    }

    private func row(_ envelope: Envelope) -> some View {
        HStack(spacing: Theme.Spacing.small) {
            Text(envelope.emoji)
            Text(envelope.name)
                .font(Theme.Font.body)
                .foregroundStyle(Palette.textPrimary)
        }
    }

    private func envelopes(of kind: EnvelopeKind) -> [Envelope] {
        allEnvelopes
            .filter { $0.kind == kind && !$0.isRetired }
            .sorted { $0.sortIndex < $1.sortIndex }
    }

    private var retired: [Envelope] {
        allEnvelopes.filter(\.isRetired)
    }

    private func move(_ group: [Envelope], from offsets: IndexSet, to destination: Int) {
        var reordered = group
        reordered.move(fromOffsets: offsets, toOffset: destination)
        BudgetStore(context: modelContext).reorder(reordered)
    }
}

#Preview {
    ArrangeEnvelopesSheet()
        .modelContainer(AppModelContainer.makePreview())
}
