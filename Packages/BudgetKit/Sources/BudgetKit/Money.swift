import Foundation

/// A currency amount stored as whole minor units (cents), never as a `Double`.
///
/// Every balance, allocation and transaction in the app flows through this type
/// so that repeated stuffing and spending can never accumulate binary rounding
/// error. Division rounds to the nearest cent and `split(into:)` distributes the
/// remainder so a divided amount always sums back to the original.
public struct Money: Hashable, Sendable, Codable, Comparable {
    /// The amount in minor units: 1234 means $12.34.
    public var minorUnits: Int

    public init(minorUnits: Int) {
        self.minorUnits = minorUnits
    }

    /// Builds an amount from a major-unit value, e.g. `Money(major: 12.34)`.
    /// Rounds half away from zero, matching how a person reads a receipt.
    public init(major: Double) {
        self.minorUnits = Int((major * 100).rounded(.toNearestOrAwayFromZero))
    }

    public static let zero = Money(minorUnits: 0)

    public var isZero: Bool { minorUnits == 0 }
    public var isNegative: Bool { minorUnits < 0 }
    public var isPositive: Bool { minorUnits > 0 }

    /// The amount expressed in major units, for charts and other float-only APIs.
    public var doubleValue: Double { Double(minorUnits) / 100 }

    public var magnitude: Money { Money(minorUnits: abs(minorUnits)) }

    // MARK: - Arithmetic

    public static func + (lhs: Money, rhs: Money) -> Money {
        Money(minorUnits: lhs.minorUnits + rhs.minorUnits)
    }

    public static func - (lhs: Money, rhs: Money) -> Money {
        Money(minorUnits: lhs.minorUnits - rhs.minorUnits)
    }

    public static prefix func - (value: Money) -> Money {
        Money(minorUnits: -value.minorUnits)
    }

    public static func += (lhs: inout Money, rhs: Money) { lhs = lhs + rhs }
    public static func -= (lhs: inout Money, rhs: Money) { lhs = lhs - rhs }

    public static func * (lhs: Money, rhs: Int) -> Money {
        Money(minorUnits: lhs.minorUnits * rhs)
    }

    /// Divides into `divisor` equal parts, rounding to the nearest cent.
    /// Returns zero for a non-positive divisor rather than trapping, because
    /// callers derive the divisor from date math that can legitimately yield 0.
    public static func / (lhs: Money, divisor: Int) -> Money {
        guard divisor > 0 else { return .zero }
        let quotient = Double(lhs.minorUnits) / Double(divisor)
        return Money(minorUnits: Int(quotient.rounded(.toNearestOrAwayFromZero)))
    }

    public static func < (lhs: Money, rhs: Money) -> Bool {
        lhs.minorUnits < rhs.minorUnits
    }

    /// Splits into `parts` amounts that sum exactly back to `self`, spreading any
    /// leftover cents one-per-part across the leading entries.
    public func split(into parts: Int) -> [Money] {
        guard parts > 0 else { return [] }
        let base = minorUnits / parts
        var remainder = abs(minorUnits % parts)
        let step = minorUnits < 0 ? -1 : 1
        return (0..<parts).map { _ in
            var value = base
            if remainder > 0 {
                value += step
                remainder -= 1
            }
            return Money(minorUnits: value)
        }
    }

    /// Clamps to zero, used wherever a balance must not be shown as negative.
    public var clampedToZero: Money { minorUnits < 0 ? .zero : self }
}

public extension Sequence where Element == Money {
    /// Sums a sequence of amounts. Present so call sites read as
    /// `transactions.map(\.amount).total` instead of a `reduce` each time.
    var total: Money {
        reduce(Money.zero, +)
    }
}
