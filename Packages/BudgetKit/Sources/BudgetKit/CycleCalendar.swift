import Foundation

/// All budget-date arithmetic lives here: when the next budget lands, and how
/// many budgets stand between now and a bill's due date or a savings deadline.
///
/// The suggestion formulas depend entirely on that second question, so this type
/// is deliberately small, pure and heavily tested.
public struct CycleCalendar: Sendable {
    public var calendar: Calendar

    /// - Parameter calendar: injected so tests can pin a timezone. The app passes
    ///   `.current`.
    public init(calendar: Calendar = .current) {
        self.calendar = calendar
    }

    /// A calendar fixed to UTC and the Gregorian system, used by the tests and by
    /// anything that must produce identical results regardless of device settings.
    public static let utc: CycleCalendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .current
        return CycleCalendar(calendar: calendar)
    }()

    public func startOfDay(_ date: Date) -> Date {
        calendar.startOfDay(for: date)
    }

    public func isSameDay(_ lhs: Date, _ rhs: Date) -> Bool {
        calendar.isDate(lhs, inSameDayAs: rhs)
    }

    /// Whole days from `start` to `end`, negative when `end` precedes `start`.
    public func days(from start: Date, to end: Date) -> Int {
        calendar.dateComponents([.day], from: startOfDay(start), to: startOfDay(end)).day ?? 0
    }

    // MARK: - Stepping the schedule

    /// The budget date that follows `date` for the given frequency.
    ///
    /// "Twice a month" is stepped as a half-month pairing rather than a flat 15
    /// days, so a budget on the 3rd pairs with the 18th and then returns to the
    /// 3rd of the next month instead of drifting through the calendar.
    public func nextBudgetDate(after date: Date, frequency: BudgetFrequency) -> Date {
        let day = startOfDay(date)
        switch frequency {
        case .weekly:
            return calendar.date(byAdding: .day, value: 7, to: day) ?? day
        case .biweekly:
            return calendar.date(byAdding: .day, value: 14, to: day) ?? day
        case .monthly:
            return calendar.date(byAdding: .month, value: 1, to: day) ?? day
        case .semimonthly:
            return nextSemimonthlyDate(after: day)
        }
    }

    private func nextSemimonthlyDate(after day: Date) -> Date {
        let dayOfMonth = calendar.component(.day, from: day)
        if dayOfMonth <= 15 {
            return clampedDate(inMonthOf: day, monthOffset: 0, day: dayOfMonth + 15)
        }
        return clampedDate(inMonthOf: day, monthOffset: 1, day: dayOfMonth - 15)
    }

    /// Builds a date `monthOffset` months away on `day`, pulling back to the last
    /// day of that month when it is short (day 31 in a 30-day month).
    private func clampedDate(inMonthOf reference: Date, monthOffset: Int, day: Int) -> Date {
        let shifted = calendar.date(byAdding: .month, value: monthOffset, to: reference) ?? reference
        let range = calendar.range(of: .day, in: .month, for: shifted)
        let lastDay = range?.upperBound.advanced(by: -1) ?? day
        var components = calendar.dateComponents([.year, .month], from: shifted)
        components.day = min(day, lastDay)
        return calendar.date(from: components).map(startOfDay) ?? shifted
    }

    /// Every budget date from `start` (inclusive) up to and including `end`.
    /// Capped at `limit` dates so a far-future deadline cannot spin forever.
    public func budgetDates(
        startingAt start: Date,
        frequency: BudgetFrequency,
        through end: Date,
        limit: Int = 600
    ) -> [Date] {
        let first = startOfDay(start)
        let last = startOfDay(end)
        guard last >= first else { return [first] }

        var dates: [Date] = [first]
        var cursor = first
        while dates.count < limit {
            let next = nextBudgetDate(after: cursor, frequency: frequency)
            guard next > cursor, next <= last else { break }
            dates.append(next)
            cursor = next
        }
        return dates
    }

    /// How many budgets — counting the one being run right now — fall on or
    /// before `target`.
    ///
    /// This is the divisor behind both the fixed-envelope and savings-envelope
    /// suggestions: a bill due before the next budget must be funded in full
    /// today, so the result is never less than 1.
    public func budgetsRemaining(
        from start: Date,
        until target: Date,
        frequency: BudgetFrequency
    ) -> Int {
        guard startOfDay(target) >= startOfDay(start) else { return 1 }
        return max(1, budgetDates(startingAt: start, frequency: frequency, through: target).count)
    }

    /// Roughly how many budget cycles fit in a span of days. Used to turn a
    /// trailing spending total into a per-cycle average.
    public func approximateCycles(inDays days: Int, frequency: BudgetFrequency) -> Double {
        guard days > 0 else { return 1 }
        return max(1, Double(days) / frequency.approximateDayLength)
    }
}
