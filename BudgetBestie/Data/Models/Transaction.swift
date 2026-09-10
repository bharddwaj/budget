import Foundation
import SwiftData
import BudgetKit

/// A single movement of money against one envelope.
///
/// `amountMinorUnits` is always stored positive; direction comes from `kind`, so
/// a list can show "$40.00" with an arrow rather than a signed number, and the
/// balance math never depends on the sign a user happened to type.
@Model
final class Transaction {
    var id: UUID = UUID()
    var amountMinorUnits: Int = 0
    var kindRaw: String = TransactionKind.expense.rawValue
    var note: String = ""
    var date: Date = Date()
    var createdAt: Date = Date()

    /// Links the two halves of a transfer so they can be shown and undone as one.
    var transferGroupID: UUID?
    /// Set on the template row of a recurring expense.
    var recurrenceRaw: String?
    /// The next date this recurring expense is due to be recorded.
    var nextOccurrence: Date?

    var envelope: Envelope?

    init(
        amount: Money,
        kind: TransactionKind,
        note: String = "",
        date: Date = Date(),
        envelope: Envelope? = nil,
        transferGroupID: UUID? = nil,
        recurrence: RecurrenceRule = .none
    ) {
        self.id = UUID()
        self.amountMinorUnits = amount.magnitude.minorUnits
        self.kindRaw = kind.rawValue
        self.note = note
        self.date = date
        self.createdAt = Date()
        self.envelope = envelope
        self.transferGroupID = transferGroupID
        self.recurrenceRaw = recurrence == .none ? nil : recurrence.rawValue
        self.nextOccurrence = recurrence.nextDate(after: date)
    }

    // MARK: - Typed accessors

    /// Always positive. Use `signedAmount` when folding into a balance.
    var amount: Money {
        get { Money(minorUnits: amountMinorUnits) }
        set { amountMinorUnits = newValue.magnitude.minorUnits }
    }

    var kind: TransactionKind {
        get { TransactionKind(rawValue: kindRaw) ?? .expense }
        set { kindRaw = newValue.rawValue }
    }

    var recurrence: RecurrenceRule {
        get { recurrenceRaw.flatMap(RecurrenceRule.init(rawValue:)) ?? .none }
        set {
            recurrenceRaw = newValue == .none ? nil : newValue.rawValue
            nextOccurrence = newValue.nextDate(after: date)
        }
    }

    /// Negative for expenses and transfers out, positive for everything else.
    var signedAmount: Money {
        kind.signedAmount(amount)
    }

    var isRecurring: Bool {
        recurrence != .none
    }

    /// What the row shows when the user left the description blank.
    var displayTitle: String {
        if !note.isEmpty { return note }
        if let envelope { return envelope.name }
        return kind.title
    }

    /// The spend-free calendar's view of this row.
    var spendEvent: SpendEvent? {
        guard let envelope else { return nil }
        return SpendEvent(
            date: date,
            envelopeID: envelope.id,
            isExpense: kind.countsAsSpending
        )
    }
}
