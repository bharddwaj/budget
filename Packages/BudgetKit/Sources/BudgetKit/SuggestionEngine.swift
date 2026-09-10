import Foundation

/// A plain-data view of one envelope, assembled from SwiftData by the app and
/// from literals by the tests. Keeping the engine's input a value type is what
/// lets the whole suggestion layer compile and run off-device.
public struct EnvelopeSnapshot: Hashable, Sendable {
    public var id: UUID
    public var kind: EnvelopeKind
    /// What is left in the envelope right now, before this budget stuffs it.
    public var currentBalance: Money

    // Fixed envelopes
    public var billAmount: Money?
    public var billDueDate: Date?

    // Savings envelopes
    public var goalAmount: Money?
    public var goalDeadline: Date?

    /// Total spent from this envelope over `trailingWindowDays`, used for the
    /// variable-envelope average.
    public var trailingSpend: Money
    public var trailingWindowDays: Int

    public init(
        id: UUID = UUID(),
        kind: EnvelopeKind,
        currentBalance: Money = .zero,
        billAmount: Money? = nil,
        billDueDate: Date? = nil,
        goalAmount: Money? = nil,
        goalDeadline: Date? = nil,
        trailingSpend: Money = .zero,
        trailingWindowDays: Int = SuggestionEngine.trailingWindowDays
    ) {
        self.id = id
        self.kind = kind
        self.currentBalance = currentBalance
        self.billAmount = billAmount
        self.billDueDate = billDueDate
        self.goalAmount = goalAmount
        self.goalDeadline = goalDeadline
        self.trailingSpend = trailingSpend
        self.trailingWindowDays = trailingWindowDays
    }
}

/// A suggestion plus the sentence shown under the keypad explaining where the
/// number came from — the app never presents a suggested amount without saying
/// why, which is a large part of why Budget Bestie's stuffing screen feels
/// trustworthy.
public struct Suggestion: Hashable, Sendable {
    public var amount: Money
    public var rationale: String

    public init(amount: Money, rationale: String) {
        self.amount = amount
        self.rationale = rationale
    }
}

/// Computes the amount behind the keypad's `suggested` button.
///
/// The three rules mirror the ones Budget Bestie documents:
/// - **variable** — the average spent in that envelope over the past 3 months,
///   pro-rated to one budget cycle.
/// - **fixed** — the bill total divided by the number of budgets between now and
///   its due date.
/// - **savings** — the goal divided by the number of budgets before the deadline.
///
/// Each rule then subtracts whatever is already sitting in the envelope, so an
/// envelope carrying a rollover is topped up to its target rather than stuffed a
/// second full time. With an empty envelope this reduces exactly to the plain
/// formulas above.
public struct SuggestionEngine: Sendable {
    /// "The past 3 months" from the help centre.
    public static let trailingWindowDays = 90

    public var calendar: CycleCalendar
    public var format: CurrencyFormat

    public init(calendar: CycleCalendar = CycleCalendar(), format: CurrencyFormat = .usd) {
        self.calendar = calendar
        self.format = format
    }

    public func suggestion(
        for envelope: EnvelopeSnapshot,
        asOf date: Date,
        frequency: BudgetFrequency
    ) -> Suggestion {
        switch envelope.kind {
        case .variable:
            return variableSuggestion(for: envelope, frequency: frequency)
        case .fixed:
            return fixedSuggestion(for: envelope, asOf: date, frequency: frequency)
        case .savings:
            return savingsSuggestion(for: envelope, asOf: date, frequency: frequency)
        }
    }

    /// Convenience for the stuffing screen, which needs the whole set at once.
    public func suggestions(
        for envelopes: [EnvelopeSnapshot],
        asOf date: Date,
        frequency: BudgetFrequency
    ) -> [UUID: Suggestion] {
        var result: [UUID: Suggestion] = [:]
        for envelope in envelopes {
            result[envelope.id] = suggestion(for: envelope, asOf: date, frequency: frequency)
        }
        return result
    }

    // MARK: - Per-type rules

    private func variableSuggestion(
        for envelope: EnvelopeSnapshot,
        frequency: BudgetFrequency
    ) -> Suggestion {
        guard envelope.trailingSpend.isPositive else {
            return Suggestion(
                amount: .zero,
                rationale: "No spending here yet — stuff what feels right and we'll learn from it."
            )
        }

        let cycles = calendar.approximateCycles(
            inDays: envelope.trailingWindowDays,
            frequency: frequency
        )
        let perCycle = Money(
            minorUnits: Int((Double(envelope.trailingSpend.minorUnits) / cycles).rounded())
        )
        let topUp = (perCycle - envelope.currentBalance).clampedToZero
        let averageText = format.string(from: perCycle)

        return Suggestion(
            amount: topUp,
            rationale: "You spend about \(averageText) here each budget."
        )
    }

    private func fixedSuggestion(
        for envelope: EnvelopeSnapshot,
        asOf date: Date,
        frequency: BudgetFrequency
    ) -> Suggestion {
        guard let bill = envelope.billAmount, bill.isPositive else {
            return Suggestion(
                amount: .zero,
                rationale: "Add a bill amount and due date to get a suggestion."
            )
        }

        let outstanding = (bill - envelope.currentBalance).clampedToZero
        guard let dueDate = envelope.billDueDate else {
            return Suggestion(
                amount: outstanding,
                rationale: "No due date set, so this covers the full bill now."
            )
        }

        let budgets = calendar.budgetsRemaining(from: date, until: dueDate, frequency: frequency)
        let amount = outstanding / budgets

        if budgets == 1 {
            return Suggestion(
                amount: amount,
                rationale: "This is your last budget before it's due — cover it now."
            )
        }
        return Suggestion(
            amount: amount,
            rationale: "\(format.string(from: outstanding)) left to cover, across \(budgets) budgets."
        )
    }

    private func savingsSuggestion(
        for envelope: EnvelopeSnapshot,
        asOf date: Date,
        frequency: BudgetFrequency
    ) -> Suggestion {
        guard let goal = envelope.goalAmount, goal.isPositive else {
            return Suggestion(
                amount: .zero,
                rationale: "Set a goal amount to get a suggestion."
            )
        }

        let remaining = (goal - envelope.currentBalance).clampedToZero
        guard remaining.isPositive else {
            return Suggestion(amount: .zero, rationale: "Goal reached — nothing more needed.")
        }

        guard let deadline = envelope.goalDeadline else {
            return Suggestion(
                amount: .zero,
                rationale: "\(format.string(from: remaining)) to go. Add a deadline for a pace."
            )
        }

        let budgets = calendar.budgetsRemaining(from: date, until: deadline, frequency: frequency)
        let amount = remaining / budgets
        return Suggestion(
            amount: amount,
            rationale: "\(format.string(from: remaining)) to go, across \(budgets) budgets."
        )
    }
}
