import Foundation

/// The minimum a transaction needs to expose for spend-free evaluation.
public struct SpendEvent: Hashable, Sendable {
    public var date: Date
    public var envelopeID: UUID
    /// Transfers and income never break a spend-free day; only expenses do.
    public var isExpense: Bool

    public init(date: Date, envelopeID: UUID, isExpense: Bool) {
        self.date = date
        self.envelopeID = envelopeID
        self.isExpense = isExpense
    }
}

/// How a single day is drawn on the calendar.
public enum SpendFreeStatus: String, Hashable, Sendable {
    /// Green: nothing was spent from an off-limits envelope.
    case spendFree
    /// Red: at least one off-limits envelope was spent from.
    case spent
    /// Days after today, drawn plain.
    case upcoming
    /// Days before tracking began, drawn plain.
    case untracked
}

/// Marks each day green or red for the spend-free calendar.
///
/// Only envelopes the user flags as off-limits can turn a day red; fixed-bill
/// envelopes are allowed by default, so paying rent never breaks a streak.
public struct NoSpendEvaluator: Sendable {
    public var calendar: CycleCalendar

    public init(calendar: CycleCalendar = CycleCalendar()) {
        self.calendar = calendar
    }

    /// Statuses for every day in `interval`, keyed by that day's start.
    /// - Parameters:
    ///   - offLimitsEnvelopeIDs: envelopes whose spending breaks the day.
    ///   - trackingStart: the first day tracking applies; earlier days are `.untracked`.
    ///   - today: injected so the tests are not clock-dependent.
    public func statuses(
        from startDate: Date,
        to endDate: Date,
        events: [SpendEvent],
        offLimitsEnvelopeIDs: Set<UUID>,
        trackingStart: Date?,
        today: Date
    ) -> [Date: SpendFreeStatus] {
        let first = calendar.startOfDay(startDate)
        let last = calendar.startOfDay(endDate)
        guard last >= first else { return [:] }

        let breachedDays = Set(
            events
                .filter { $0.isExpense && offLimitsEnvelopeIDs.contains($0.envelopeID) }
                .map { calendar.startOfDay($0.date) }
        )
        let todayStart = calendar.startOfDay(today)
        let trackingStartDay = trackingStart.map(calendar.startOfDay)

        var result: [Date: SpendFreeStatus] = [:]
        var cursor = first
        while cursor <= last {
            result[cursor] = status(
                for: cursor,
                todayStart: todayStart,
                trackingStartDay: trackingStartDay,
                breachedDays: breachedDays
            )
            guard let next = calendar.calendar.date(byAdding: .day, value: 1, to: cursor) else { break }
            cursor = next
        }
        return result
    }

    private func status(
        for day: Date,
        todayStart: Date,
        trackingStartDay: Date?,
        breachedDays: Set<Date>
    ) -> SpendFreeStatus {
        if day > todayStart { return .upcoming }
        if let start = trackingStartDay, day < start { return .untracked }
        return breachedDays.contains(day) ? .spent : .spendFree
    }

    /// Consecutive spend-free days ending today, or ending yesterday when today
    /// has already been broken — a streak the user can still see they had.
    public func currentStreak(
        statuses: [Date: SpendFreeStatus],
        today: Date
    ) -> Int {
        var streak = 0
        var cursor = calendar.startOfDay(today)

        if statuses[cursor] == .spent {
            guard let yesterday = calendar.calendar.date(byAdding: .day, value: -1, to: cursor) else {
                return 0
            }
            cursor = yesterday
        }

        while statuses[cursor] == .spendFree {
            streak += 1
            guard let previous = calendar.calendar.date(byAdding: .day, value: -1, to: cursor) else {
                break
            }
            cursor = previous
        }
        return streak
    }

    /// Spend-free days within the given statuses, for the "N days spend-free"
    /// headline on the overview tab.
    public func spendFreeCount(statuses: [Date: SpendFreeStatus]) -> Int {
        statuses.values.filter { $0 == .spendFree }.count
    }
}
