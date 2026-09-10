import SwiftUI
import SwiftData
import BudgetKit

/// The budget flow: check your money, confirm your schedule, stuff your
/// envelopes, review, done.
struct BudgetFlowView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var model: BudgetFlowModel?

    var body: some View {
        NavigationStack {
            Group {
                if let model {
                    steps(for: model)
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .background(Palette.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Palette.textSecondary)
                }
                ToolbarItem(placement: .principal) {
                    if let model {
                        StepIndicator(step: model.step)
                    }
                }
            }
        }
        .task {
            guard model == nil else { return }
            model = BudgetFlowModel(store: BudgetStore(context: modelContext))
        }
    }

    @ViewBuilder
    private func steps(for model: BudgetFlowModel) -> some View {
        switch model.step {
        case .overview:
            BudgetOverviewStep(model: model)
        case .schedule:
            BudgetScheduleStep(model: model)
        case .allocate:
            BudgetAllocationStep(model: model)
        case .review:
            BudgetReviewStep(model: model) {
                model.createBudget()
                dismiss()
            }
        }
    }
}

/// Four dots along the top so it's clear how much of the flow is left.
struct StepIndicator: View {
    var step: BudgetFlowModel.Step

    var body: some View {
        HStack(spacing: 6) {
            ForEach(BudgetFlowModel.Step.allCases, id: \.rawValue) { candidate in
                Capsule()
                    .fill(candidate.rawValue <= step.rawValue ? Palette.accent : Palette.surfaceMuted)
                    .frame(width: candidate == step ? 20 : 8, height: 8)
            }
        }
        .animation(Theme.Motion.value, value: step)
        .accessibilityLabel("Step \(step.rawValue + 1) of \(BudgetFlowModel.Step.allCases.count)")
    }
}

/// Shared chrome for the flow's screens: a heading, scrollable content, and a
/// button bar pinned to the bottom.
struct BudgetStepScaffold<Content: View, Actions: View>: View {
    var title: String
    var subtitle: String?
    @ViewBuilder var content: Content
    @ViewBuilder var actions: Actions

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.large) {
                    VStack(alignment: .leading, spacing: Theme.Spacing.tight) {
                        Text(title)
                            .font(Theme.Font.title)
                            .foregroundStyle(Palette.textPrimary)
                        if let subtitle {
                            Text(subtitle)
                                .font(Theme.Font.callout)
                                .foregroundStyle(Palette.textSecondary)
                        }
                    }
                    content
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, Theme.Spacing.screenMargin)
                .padding(.vertical, Theme.Spacing.medium)
            }

            VStack(spacing: Theme.Spacing.small) {
                actions
            }
            .padding(.horizontal, Theme.Spacing.screenMargin)
            .padding(.top, Theme.Spacing.small)
            .padding(.bottom, Theme.Spacing.medium)
            .background(Palette.background)
        }
    }
}

#Preview {
    BudgetFlowView()
        .modelContainer(AppModelContainer.makePreview())
}
