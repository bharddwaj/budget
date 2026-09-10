import Foundation
import SwiftData
import BudgetKit

/// Every write the app makes goes through here.
///
/// Balances are derived state that must stay in step with the ledger, so no view
/// ever edits `Envelope.balance` directly — it records a transaction and lets
/// this type apply the movement. That single rule is what keeps the home screen,
/// the envelope detail and the insights tab from ever disagreeing.
@MainActor
struct BudgetStore {
    let context: ModelContext
    var calendar: CycleCalendar = CycleCalendar()

    init(context: ModelContext, calendar: CycleCalendar = CycleCalendar()) {
        self.context = context
        self.calendar = calendar
    }

    // MARK: - Settings

    /// The settings row, created on first access.
    @discardableResult
    func settings() -> AppSettings {
        let descriptor = FetchDescriptor<AppSettings>()
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }
        let created = AppSettings()
        context.insert(created)
        save()
        return created
    }

    // MARK: - Cycles

    /// The budget currently being spent from, or nil before the first budget.
    func activeCycle() -> BudgetCycle? {
        var descriptor = FetchDescriptor<BudgetCycle>(
            predicate: #Predicate { $0.isActive },
            sortBy: [SortDescriptor(\.startDate, order: .reverse)]
        )
        descriptor.fetchLimit = 1
        return try? context.fetch(descriptor).first
    }

    func allCycles() -> [BudgetCycle] {
        let descriptor = FetchDescriptor<BudgetCycle>(
            sortBy: [SortDescriptor(\.startDate, order: .reverse)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    // MARK: - Envelopes

    /// Envelopes in the order the home screen shows them: by type, then by the
    /// user's own arrangement.
    func envelopes(includeRetired: Bool = false) -> [Envelope] {
        let descriptor = FetchDescriptor<Envelope>(
            sortBy: [SortDescriptor(\.sortIndex), SortDescriptor(\.createdAt)]
        )
        let all = (try? context.fetch(descriptor)) ?? []
        let visible = includeRetired ? all : all.filter { !$0.isRetired }
        return visible.sorted { lhs, rhs in
            let lhsRank = EnvelopeKind.displayOrder.firstIndex(of: lhs.kind) ?? 0
            let rhsRank = EnvelopeKind.displayOrder.firstIndex(of: rhs.kind) ?? 0
            if lhsRank != rhsRank { return lhsRank < rhsRank }
            return lhs.sortIndex < rhs.sortIndex
        }
    }

    func envelopes(of kind: EnvelopeKind, includeRetired: Bool = false) -> [Envelope] {
        envelopes(includeRetired: includeRetired).filter { $0.kind == kind }
    }

    @discardableResult
    func createEnvelope(
        emoji: String,
        name: String,
        kind: EnvelopeKind
    ) -> Envelope {
        let siblings = envelopes(of: kind, includeRetired: true)
        let envelope = Envelope(
            emoji: emoji,
            name: name,
            kind: kind,
            sortIndex: (siblings.map(\.sortIndex).max() ?? -1) + 1
        )
        context.insert(envelope)
        save()
        return envelope
    }

    /// Persists a drag-to-reorder within one type group.
    func reorder(_ ordered: [Envelope]) {
        for (index, envelope) in ordered.enumerated() {
            envelope.sortIndex = index
        }
        save()
    }

    /// Retiring keeps the envelope's history but takes it out of stuffing and
    /// the transaction picker. Any money left inside is returned to the pool by
    /// the next budget, since the balance simply stops being counted.
    func retire(_ envelope: Envelope) {
        envelope.isRetired = true
        save()
    }

    func unretire(_ envelope: Envelope) {
        envelope.isRetired = false
        save()
    }

    /// Folds `source` into `destination`: its balance and its whole transaction
    /// and allocation history move across, then the empty envelope is removed.
    func merge(_ source: Envelope, into destination: Envelope) {
        guard source.id != destination.id else { return }

        destination.balance += source.balance
        source.balance = .zero

        for transaction in source.transactions {
            transaction.envelope = destination
        }
        for allocation in source.allocations {
            allocation.envelope = destination
        }

        context.delete(source)
        save()
    }

    /// Deletes an envelope and everything recorded against it. `merge` is the
    /// non-destructive alternative and is what the UI offers first.
    func delete(_ envelope: Envelope) {
        context.delete(envelope)
        save()
    }

    /// Changing type keeps the balance and history, and clears the details that
    /// no longer apply so a former bill does not keep a stale due date.
    func changeKind(of envelope: Envelope, to kind: EnvelopeKind) {
        guard envelope.kind != kind else { return }
        envelope.kind = kind

        if kind != .fixed {
            envelope.billAmount = nil
            envelope.billDueDate = nil
            envelope.billRecurrenceRaw = nil
            envelope.lastPaidOn = nil
        }
        if kind != .savings {
            envelope.goalAmount = nil
            envelope.goalDeadline = nil
        }
        save()
    }

    // MARK: - Transactions

    /// Records a transaction and moves the envelope's balance to match.
    @discardableResult
    func record(
        amount: Money,
        kind: TransactionKind,
        note: String = "",
        date: Date = Date(),
        envelope: Envelope,
        recurrence: RecurrenceRule = .none,
        transferGroupID: UUID? = nil
    ) -> Transaction {
        let transaction = Transaction(
            amount: amount,
            kind: kind,
            note: note,
            date: date,
            envelope: envelope,
            transferGroupID: transferGroupID,
            recurrence: recurrence
        )
        context.insert(transaction)
        envelope.balance += transaction.signedAmount

        // Paying a fixed bill silences its reminder until the next due date.
        if kind == .expense, envelope.kind == .fixed {
            envelope.lastPaidOn = date
            advanceBillDueDateIfPaid(envelope)
        }

        save()
        return transaction
    }

    /// Reverses a transaction's effect and removes it. Deleting one half of a
    /// transfer removes the other half too, so the pair can never be orphaned.
    func delete(_ transaction: Transaction) {
        if let groupID = transaction.transferGroupID {
            for half in transactions(inTransferGroup: groupID) {
                half.envelope?.balance -= half.signedAmount
                context.delete(half)
            }
        } else {
            transaction.envelope?.balance -= transaction.signedAmount
            context.delete(transaction)
        }
        save()
    }

    /// Applies an edit by backing the old movement out and the new one in, which
    /// keeps balances correct across a change of amount, kind or envelope.
    func update(
        _ transaction: Transaction,
        amount: Money,
        kind: TransactionKind,
        note: String,
        date: Date,
        envelope: Envelope,
        recurrence: RecurrenceRule
    ) {
        transaction.envelope?.balance -= transaction.signedAmount

        transaction.amount = amount
        transaction.kind = kind
        transaction.note = note
        transaction.date = date
        transaction.envelope = envelope
        transaction.recurrence = recurrence

        envelope.balance += transaction.signedAmount
        save()
    }

    /// Moves money between envelopes as a linked pair of rows.
    func transfer(
        _ amount: Money,
        from source: Envelope,
        to destination: Envelope,
        date: Date = Date(),
        note: String = ""
    ) {
        guard amount.isPositive, source.id != destination.id else { return }
        let groupID = UUID()
        let label = note.isEmpty ? "\(source.name) → \(destination.name)" : note

        record(
            amount: amount,
            kind: .transferOut,
            note: label,
            date: date,
            envelope: source,
            transferGroupID: groupID
        )
        record(
            amount: amount,
            kind: .transferIn,
            note: label,
            date: date,
            envelope: destination,
            transferGroupID: groupID
        )
    }

    func transactions(inTransferGroup groupID: UUID) -> [Transaction] {
        let descriptor = FetchDescriptor<Transaction>(
            predicate: #Predicate { $0.transferGroupID == groupID }
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    /// Newest first, optionally limited to a date range.
    func transactions(from start: Date? = nil, to end: Date? = nil) -> [Transaction] {
        let descriptor = FetchDescriptor<Transaction>(
            sortBy: [SortDescriptor(\.date, order: .reverse), SortDescriptor(\.createdAt, order: .reverse)]
        )
        let all = (try? context.fetch(descriptor)) ?? []
        return all.filter { transaction in
            if let start, transaction.date < start { return false }
            if let end, transaction.date > end { return false }
            return true
        }
    }

    // MARK: - Budget creation

    /// Closes the active cycle and opens a new one with the given stuffing.
    ///
    /// Each allocation is also written as a `stuffing` transaction so that an
    /// envelope's detail screen reads as one continuous ledger of money in and
    /// money out, rather than allocations and spending living in separate lists.
    @discardableResult
    func createBudget(
        startingBalance: Money,
        frequency: BudgetFrequency,
        startDate: Date,
        nextBudgetDate: Date,
        allocations: [(envelope: Envelope, amount: Money, suggested: Money)]
    ) -> BudgetCycle {
        if let current = activeCycle() {
            current.isActive = false
            current.closedAt = startDate
        }

        let cycle = BudgetCycle(
            startDate: startDate,
            nextBudgetDate: nextBudgetDate,
            frequency: frequency,
            startingBalance: startingBalance
        )
        context.insert(cycle)

        for entry in allocations {
            let allocation = Allocation(
                amount: entry.amount,
                suggested: entry.suggested,
                envelope: entry.envelope,
                cycle: cycle,
                createdAt: startDate
            )
            context.insert(allocation)

            guard !entry.amount.isZero else { continue }
            let stuffing = Transaction(
                amount: entry.amount,
                kind: entry.amount.isPositive ? .stuffing : .unstuffing,
                note: "Budget stuffing",
                date: startDate,
                envelope: entry.envelope
            )
            context.insert(stuffing)
        }

        // The stuffing screen works from target balances, so an envelope's new
        // balance is exactly what was allocated to it plus what it carried in.
        for entry in allocations {
            entry.envelope.balance += entry.amount
        }

        let settings = settings()
        if settings.noSpendTrackingStart == nil {
            settings.noSpendTrackingStart = startDate
        }

        save()
        return cycle
    }

    // MARK: - Helpers

    /// Rolls a paid bill forward to its next due date.
    private func advanceBillDueDateIfPaid(_ envelope: Envelope) {
        guard let due = envelope.billDueDate else { return }
        let rule = envelope.billRecurrence
        guard rule != .none else { return }
        guard let next = rule.nextDate(after: due, calendar: calendar.calendar) else { return }
        envelope.billDueDate = next
    }

    func save() {
        do {
            try context.save()
        } catch {
            // SwiftData raises on constraint violations and disk failures. Losing
            // a write silently would be worse than a loud failure in debug.
            assertionFailure("Failed to save: \(error)")
        }
    }
}
