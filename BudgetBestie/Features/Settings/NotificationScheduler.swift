import Foundation
import UserNotifications
import BudgetKit

/// Schedules the four reminders Budget Bestie offers.
///
/// Everything is rescheduled from scratch each time settings change: pending
/// requests are cleared and rebuilt, so a toggle can never leave a stale
/// notification behind.
enum NotificationScheduler {

    private enum Identifier {
        static let daily = "reminder.daily"
        static let budget = "reminder.budget"
        static let transaction = "reminder.transaction"
        static func bill(_ envelopeID: UUID) -> String { "reminder.bill.\(envelopeID.uuidString)" }
    }

    /// Asks for permission the first time a reminder is switched on.
    @discardableResult
    static func requestAuthorization() async -> Bool {
        do {
            return try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .sound, .badge])
        } catch {
            return false
        }
    }

    static func authorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Rebuilds every scheduled reminder from the current settings and data.
    @MainActor
    static func reschedule(settings: AppSettings, cycle: BudgetCycle?, envelopes: [Envelope]) async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        if settings.dailyReminderEnabled {
            await add(
                identifier: Identifier.daily,
                title: "How'd today go?",
                body: "Take ten seconds to log what you spent.",
                trigger: UNCalendarNotificationTrigger(
                    dateMatching: settings.dailyReminderTime,
                    repeats: true
                )
            )
        }

        if settings.transactionReminderEnabled {
            // A second, later nudge for people who need two.
            var components = settings.dailyReminderTime
            components.hour = min(22, (components.hour ?? 20) + 2)
            await add(
                identifier: Identifier.transaction,
                title: "Anything left to record?",
                body: "Catching it now keeps your envelopes honest.",
                trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            )
        }

        if settings.budgetReminderEnabled, let cycle {
            var components = Calendar.current.dateComponents(
                [.year, .month, .day],
                from: cycle.nextBudgetDate
            )
            components.hour = 9
            await add(
                identifier: Identifier.budget,
                title: "It's budget day ✨",
                body: "Time to stuff your envelopes for the next stretch.",
                trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            )
        }

        if settings.billReminderEnabled {
            await scheduleBillReminders(settings: settings, envelopes: envelopes)
        }
    }

    @MainActor
    private static func scheduleBillReminders(settings: AppSettings, envelopes: [Envelope]) async {
        let calendar = Calendar.current
        let bills = envelopes.filter { $0.kind == .fixed && !$0.isRetired }

        for envelope in bills {
            guard let due = envelope.billDueDate,
                  let fireDate = calendar.date(
                      byAdding: .day,
                      value: -settings.billReminderLeadDays,
                      to: due
                  ),
                  fireDate > Date()
            else { continue }

            var components = calendar.dateComponents([.year, .month, .day], from: fireDate)
            components.hour = 9

            let amount = settings.currencyFormat.string(from: envelope.billAmount ?? .zero)
            await add(
                identifier: Identifier.bill(envelope.id),
                title: "\(envelope.emoji) \(envelope.name) is due soon",
                body: "\(amount) due \(due.formatted(.dateTime.month().day())).",
                trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            )
        }
    }

    private static func add(
        identifier: String,
        title: String,
        body: String,
        trigger: UNNotificationTrigger
    ) async {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )
        try? await UNUserNotificationCenter.current().add(request)
    }

    static func cancelAll() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
}
