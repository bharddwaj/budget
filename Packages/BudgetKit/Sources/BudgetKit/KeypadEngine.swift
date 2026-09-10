import Foundation

/// The keys on Budget Bestie's budgeting keypad.
public enum KeypadKey: Hashable, Sendable {
    case digit(Int)
    case doubleZero
    /// Backspace — removes the last typed digit, or clears the amount if none
    /// have been typed yet.
    case delete
    case add
    case subtract
    case equals
    /// Fills in the engine-calculated recommendation for this envelope.
    case suggested
    /// Zeroes the envelope out without having to subtract its balance by hand.
    case empty
}

/// The keypad's state machine, kept out of the view so it can be tested.
///
/// Amounts are entered the way a cash register takes them: digits fill in from
/// the right, so `1`, `2`, `3` reads as $1.23. Pressing `+` or `-` parks the
/// current value and starts a fresh entry; `=` resolves it, which is what lets
/// someone add to an existing envelope balance without doing the mental math.
public struct KeypadEngine: Hashable, Sendable {
    /// The amount currently shown on the big display.
    public private(set) var value: Money
    /// Set once the user starts typing over the incoming amount, so the first
    /// digit replaces the balance rather than appending to it.
    public private(set) var isTyping: Bool
    /// The parked left-hand side of a pending `+` / `-`.
    public private(set) var pendingValue: Money?
    public private(set) var pendingOperation: Operation?

    public enum Operation: Hashable, Sendable {
        case add
        case subtract
    }

    /// Largest amount the keypad accepts, guarding against runaway digit entry.
    public static let maximumMinorUnits = 99_999_999_99

    public init(value: Money = .zero) {
        self.value = value
        self.isTyping = false
        self.pendingValue = nil
        self.pendingOperation = nil
    }

    /// True while a `+` or `-` is waiting on `=`, which the view uses to show the
    /// running expression above the display.
    public var hasPendingOperation: Bool { pendingOperation != nil }

    public mutating func press(_ key: KeypadKey, suggested: Money = .zero) {
        switch key {
        case .digit(let digit):
            appendDigits(String(max(0, min(9, digit))))
        case .doubleZero:
            appendDigits("00")
        case .delete:
            deleteLastDigit()
        case .add:
            beginOperation(.add)
        case .subtract:
            beginOperation(.subtract)
        case .equals:
            resolvePendingOperation()
        case .suggested:
            replace(with: suggested)
        case .empty:
            replace(with: .zero)
        }
    }

    /// Discards any half-finished expression and returns the final amount, which
    /// is what `next` commits to the envelope.
    public mutating func commit() -> Money {
        resolvePendingOperation()
        isTyping = false
        return value
    }

    /// Loads the next envelope's balance in without carrying state across.
    public mutating func reset(to newValue: Money) {
        self = KeypadEngine(value: newValue)
    }

    // MARK: - Key handling

    private mutating func appendDigits(_ digits: String) {
        let existing = isTyping ? String(abs(value.minorUnits)) : "0"
        let combined = (existing == "0" ? "" : existing) + digits
        let trimmed = String(combined.prefix(11))
        let parsed = Int(trimmed) ?? 0
        value = Money(minorUnits: min(parsed, Self.maximumMinorUnits))
        isTyping = true
    }

    private mutating func deleteLastDigit() {
        guard isTyping else {
            // Nothing typed yet: the first delete clears the incoming balance,
            // matching how the real keypad behaves on a fresh envelope.
            value = .zero
            isTyping = true
            return
        }
        let digits = String(abs(value.minorUnits))
        let remaining = String(digits.dropLast())
        value = Money(minorUnits: Int(remaining) ?? 0)
    }

    private mutating func beginOperation(_ operation: Operation) {
        // Chaining without pressing equals resolves what came before first.
        resolvePendingOperation()
        pendingValue = value
        pendingOperation = operation
        value = .zero
        isTyping = false
    }

    private mutating func resolvePendingOperation() {
        guard let operation = pendingOperation, let left = pendingValue else { return }
        switch operation {
        case .add:
            value = left + value
        case .subtract:
            value = left - value
        }
        pendingValue = nil
        pendingOperation = nil
        isTyping = false
    }

    private mutating func replace(with newValue: Money) {
        pendingValue = nil
        pendingOperation = nil
        value = newValue
        isTyping = false
    }
}
