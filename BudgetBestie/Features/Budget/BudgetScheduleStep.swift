import SwiftUI
import BudgetKit

/// Step 2 — when the next budget lands and how often you budget.
///
/// The frequency chosen here is the divisor behind every suggested amount on the
/// next screen, so changing it re-runs the suggestions immediately.
struct BudgetScheduleStep: View {
    @Bindable var model: BudgetFlowModel

    var body: some View {
        BudgetStepScaffold(
            title: "When's your next budget?",
            subtitle: "Usually your next payday. We'll remind you when it comes around."
        ) {
            datePickerCard
            frequencyCard
        } actions: {
            PillButton(title: "yup, looks right") {
                model.advance()
            }
            PillButton(title: "previous", style: .quiet) {
                model.goBack()
            }
        }
    }

    private var datePickerCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.medium) {
            SectionHeader(title: "Next budget date")
            DatePicker(
                "Next budget date",
                selection: $model.nextBudgetDate,
                in: model.startDate...,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .tint(Palette.accent)
            .labelsHidden()
        }
        .card()
    }

    private var frequencyCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.small) {
            SectionHeader(title: "How often do you budget?")

            ForEach(BudgetFrequency.allCases) { frequency in
                Button {
                    model.frequency = frequency
                    model.frequencyChanged()
                } label: {
                    HStack {
                        Text(frequency.title)
                            .font(Theme.Font.body)
                            .foregroundStyle(Palette.textPrimary)
                        Spacer()
                        Image(systemName: model.frequency == frequency
                              ? "checkmark.circle.fill"
                              : "circle")
                            .foregroundStyle(model.frequency == frequency
                                             ? Palette.accent
                                             : Palette.separator)
                    }
                    .padding(.vertical, Theme.Spacing.small)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                if frequency != BudgetFrequency.allCases.last {
                    Divider().overlay(Palette.separator)
                }
            }
        }
        .card()
        .animation(Theme.Motion.value, value: model.frequency)
    }
}
