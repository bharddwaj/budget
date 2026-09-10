import SwiftUI
import SwiftData
import BudgetKit

/// Reminders, appearance, currency, security, and the destructive stuff.
struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query private var settingsRows: [AppSettings]
    @Query private var envelopes: [Envelope]
    @Query(filter: #Predicate<BudgetCycle> { $0.isActive }) private var activeCycles: [BudgetCycle]

    @State private var isConfirmingStartFresh = false
    @State private var isConfirmingDelete = false

    private var settings: AppSettings? { settingsRows.first }

    var body: some View {
        NavigationStack {
            Group {
                if let settings {
                    form(settings)
                } else {
                    ProgressView()
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Palette.accent)
                }
            }
        }
    }

    private func form(_ settings: AppSettings) -> some View {
        @Bindable var settings = settings

        return Form {
            Section("Reminders") {
                Toggle("Daily check-in", isOn: $settings.dailyReminderEnabled)
                if settings.dailyReminderEnabled {
                    Stepper(
                        "At \(settings.dailyReminderHour):00",
                        value: $settings.dailyReminderHour,
                        in: 6...22
                    )
                }
                Toggle("Second nudge for transactions", isOn: $settings.transactionReminderEnabled)
                Toggle("Budget day", isOn: $settings.budgetReminderEnabled)
                Toggle("Bills coming due", isOn: $settings.billReminderEnabled)
                if settings.billReminderEnabled {
                    Stepper(
                        "\(settings.billReminderLeadDays) days ahead",
                        value: $settings.billReminderLeadDays,
                        in: 1...14
                    )
                }
            }

            Section("Appearance") {
                Picker("Theme", selection: $settings.theme) {
                    ForEach(AppThemePreference.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
            }

            Section("Currency") {
                HStack {
                    Text("Symbol")
                    Spacer()
                    TextField("$", text: $settings.currencySymbol)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                }
                Toggle("Symbol before the amount", isOn: $settings.currencySymbolIsLeading)
                Stepper(
                    "\(settings.currencyDecimals) decimal places",
                    value: $settings.currencyDecimals,
                    in: 0...2
                )
                HStack {
                    Text("Example")
                    Spacer()
                    Text(settings.currencyFormat.string(from: Money(major: 1234.5)))
                        .foregroundStyle(Palette.textSecondary)
                }
            }

            Section {
                Toggle("Require Face ID to open", isOn: $settings.faceIDEnabled)
            } header: {
                Text("Privacy")
            } footer: {
                Text("Your budget stays on this phone. There's no account and nothing is uploaded anywhere.")
            }

            Section("Start over") {
                Button("Replay the intro") {
                    settings.hasOnboarded = false
                    save()
                    dismiss()
                }
                Button("Start fresh") {
                    isConfirmingStartFresh = true
                }
                .foregroundStyle(Palette.warning)
                Button("Delete all my data") {
                    isConfirmingDelete = true
                }
                .foregroundStyle(Palette.negative)
            }

            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text(appVersion).foregroundStyle(Palette.textSecondary)
                }
            }
        }
        .tint(Palette.accent)
        .scrollContentBackground(.hidden)
        .background(Palette.background)
        // Any settings change can affect what is scheduled, so rebuild on each.
        .onChange(of: settingsFingerprint(settings)) { _, _ in
            save()
            Task { await rescheduleReminders(settings) }
        }
        .confirmationDialog(
            "Clear your transactions and budgets but keep your envelopes?",
            isPresented: $isConfirmingStartFresh,
            titleVisibility: .visible
        ) {
            Button("Start fresh", role: .destructive) { startFresh() }
        }
        .confirmationDialog(
            "Delete everything? This can't be undone.",
            isPresented: $isConfirmingDelete,
            titleVisibility: .visible
        ) {
            Button("Delete everything", role: .destructive) { deleteEverything() }
        }
    }

    // MARK: - Behaviour

    /// One value that changes whenever anything schedule-affecting changes, so a
    /// single `onChange` can cover the whole form.
    private func settingsFingerprint(_ settings: AppSettings) -> String {
        [
            settings.dailyReminderEnabled.description,
            String(settings.dailyReminderHour),
            settings.transactionReminderEnabled.description,
            settings.budgetReminderEnabled.description,
            settings.billReminderEnabled.description,
            String(settings.billReminderLeadDays),
            settings.themeRaw,
            settings.currencySymbol,
            settings.currencySymbolIsLeading.description,
            String(settings.currencyDecimals),
            settings.faceIDEnabled.description
        ].joined(separator: "|")
    }

    private func rescheduleReminders(_ settings: AppSettings) async {
        let wantsAny = settings.dailyReminderEnabled
            || settings.transactionReminderEnabled
            || settings.budgetReminderEnabled
            || settings.billReminderEnabled

        guard wantsAny else {
            NotificationScheduler.cancelAll()
            return
        }
        guard await NotificationScheduler.requestAuthorization() else { return }
        await NotificationScheduler.reschedule(
            settings: settings,
            cycle: activeCycles.first,
            envelopes: envelopes
        )
    }

    private func save() {
        BudgetStore(context: modelContext).save()
    }

    /// Keeps the envelopes and their setup, drops the history and balances.
    private func startFresh() {
        try? modelContext.delete(model: Transaction.self)
        try? modelContext.delete(model: Allocation.self)
        try? modelContext.delete(model: BudgetCycle.self)
        for envelope in envelopes {
            envelope.balance = .zero
            envelope.lastPaidOn = nil
        }
        settings?.noSpendTrackingStart = nil
        save()
        dismiss()
    }

    private func deleteEverything() {
        NotificationScheduler.cancelAll()
        SeedData.wipe(context: modelContext)
        dismiss()
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}

#Preview {
    SettingsView()
        .modelContainer(AppModelContainer.makePreview())
}
