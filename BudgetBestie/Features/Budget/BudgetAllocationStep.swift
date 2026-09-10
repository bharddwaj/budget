import SwiftUI
import BudgetKit

/// Step 3 — stuffing. One envelope at a time, with the money still to place
/// counting down at the top until it hits $0.00.
struct BudgetAllocationStep: View {
    @Bindable var model: BudgetFlowModel

    @State private var engine = KeypadEngine()
    @Environment(\.currencyFormat) private var format

    var body: some View {
        VStack(spacing: Theme.Spacing.medium) {
            remainingHeader
            envelopeStrip

            if let envelope = model.currentEnvelope {
                envelopeCard(envelope)

                KeypadDisplay(engine: engine, caption: model.rationale(for: envelope))

                BudgetKeypad(engine: $engine, suggested: model.suggestedTarget(for: envelope))

                Spacer(minLength: 0)

                PillButton(title: isLastEnvelope ? "review" : "next") {
                    model.commitCurrentAndAdvance(target: engine.commit())
                }
                PillButton(title: "previous", style: .quiet) {
                    stepBack()
                }
            } else {
                noEnvelopes
            }
        }
        .padding(.horizontal, Theme.Spacing.screenMargin)
        .padding(.bottom, Theme.Spacing.medium)
        .background(Palette.background)
        .onAppear { syncEngine() }
        .onChange(of: model.allocationIndex) { _, _ in syncEngine() }
        // Keep the running total honest while the user is still typing.
        .onChange(of: engine.value) { _, newValue in
            guard let envelope = model.currentEnvelope else { return }
            model.targets[envelope.id] = newValue
        }
    }

    // MARK: - Pieces

    private var remainingHeader: some View {
        VStack(spacing: 2) {
            Text(model.isFullyAllocated ? "all stuffed 🎉" : "left to stuff")
                .font(Theme.Font.caption)
                .foregroundStyle(Palette.textSecondary)
            AmountText(
                amount: model.remaining,
                font: Theme.Font.amount,
                color: remainingColor
            )
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.small)
        .card(padding: Theme.Spacing.small, background: remainingBackground)
    }

    private var remainingColor: Color {
        if model.remaining.isZero { return Palette.positive }
        return model.remaining.isNegative ? Palette.negative : Palette.textPrimary
    }

    private var remainingBackground: Color {
        if model.remaining.isZero { return Palette.positive.opacity(0.12) }
        return model.remaining.isNegative ? Palette.negative.opacity(0.12) : Palette.surface
    }

    /// A tappable row of every envelope, so you can jump back and adjust one
    /// without walking the whole list again.
    private var envelopeStrip: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.small) {
                    ForEach(Array(model.envelopes.enumerated()), id: \.element.id) { index, envelope in
                        Button {
                            model.commitCurrent(engine.commit(), thenJumpTo: index)
                        } label: {
                            Text(envelope.emoji)
                                .font(.system(size: 20))
                                .frame(width: 42, height: 42)
                                .background(
                                    index == model.allocationIndex
                                        ? envelope.kind.color.opacity(0.28)
                                        : Palette.surfaceMuted
                                )
                                .clipShape(Circle())
                                .overlay(
                                    Circle().strokeBorder(
                                        index == model.allocationIndex
                                            ? envelope.kind.color
                                            : .clear,
                                        lineWidth: 2
                                    )
                                )
                        }
                        .buttonStyle(.plain)
                        .id(index)
                        .accessibilityLabel(envelope.name)
                    }
                }
                .padding(.vertical, 4)
            }
            .onChange(of: model.allocationIndex) { _, index in
                withAnimation(Theme.Motion.value) { proxy.scrollTo(index, anchor: .center) }
            }
        }
    }

    private func envelopeCard(_ envelope: Envelope) -> some View {
        HStack(spacing: Theme.Spacing.medium) {
            EmojiBadge(emoji: envelope.emoji, tint: envelope.kind.color, size: 50)
            VStack(alignment: .leading, spacing: 2) {
                Text(envelope.name)
                    .font(Theme.Font.headline)
                    .foregroundStyle(Palette.textPrimary)
                Text(envelope.kind.title)
                    .font(Theme.Font.caption)
                    .foregroundStyle(envelope.kind.color)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("was")
                    .font(Theme.Font.caption)
                    .foregroundStyle(Palette.textSecondary)
                AmountText(amount: envelope.balance, font: Theme.Font.callout)
            }
        }
        .card()
    }

    private var noEnvelopes: some View {
        VStack(spacing: Theme.Spacing.medium) {
            Text("You don't have any envelopes yet.")
                .font(Theme.Font.body)
                .foregroundStyle(Palette.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxHeight: .infinity)
    }

    private var isLastEnvelope: Bool {
        model.allocationIndex >= model.envelopes.count - 1
    }

    // MARK: - Behaviour

    private func syncEngine() {
        guard let envelope = model.currentEnvelope else { return }
        engine.reset(to: model.target(for: envelope))
    }

    private func stepBack() {
        if model.allocationIndex > 0 {
            model.commitCurrent(engine.commit(), thenJumpTo: model.allocationIndex - 1)
        } else {
            model.goBack()
        }
    }
}
