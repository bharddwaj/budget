import { addDays, eachDay, type DayKey } from './dates'

/** The minimum a transaction needs to expose for spend-free evaluation. */
export interface SpendEvent {
  date: DayKey
  envelopeID: string
  /** Transfers and income never break a spend-free day; only expenses do. */
  isExpense: boolean
}

/** How a single day is drawn on the calendar. */
export type SpendFreeStatus =
  /** Green: nothing was spent from an off-limits envelope. */
  | 'spendFree'
  /** Red: at least one off-limits envelope was spent from. */
  | 'spent'
  /** Days after today, drawn plain. */
  | 'upcoming'
  /** Days before tracking began, drawn plain. */
  | 'untracked'

export type DayStatuses = Map<DayKey, SpendFreeStatus>

/**
 * Statuses for every day from `start` through `end`, keyed by day.
 *
 * Only envelopes the user flags as off-limits can turn a day red; fixed-bill
 * envelopes are allowed by default, so paying rent never breaks a streak.
 */
export function statuses(
  start: DayKey,
  end: DayKey,
  events: SpendEvent[],
  offLimitsEnvelopeIDs: Set<string>,
  trackingStart: DayKey | null,
  today: DayKey,
): DayStatuses {
  const result: DayStatuses = new Map()
  if (end < start) return result

  const breachedDays = new Set(
    events
      .filter((event) => event.isExpense && offLimitsEnvelopeIDs.has(event.envelopeID))
      .map((event) => event.date),
  )

  for (const day of eachDay(start, end)) {
    result.set(day, status(day, today, trackingStart, breachedDays))
  }
  return result
}

function status(
  day: DayKey,
  today: DayKey,
  trackingStart: DayKey | null,
  breachedDays: Set<DayKey>,
): SpendFreeStatus {
  if (day > today) return 'upcoming'
  if (trackingStart !== null && day < trackingStart) return 'untracked'
  return breachedDays.has(day) ? 'spent' : 'spendFree'
}

/**
 * Consecutive spend-free days ending today, or ending yesterday when today has
 * already been broken — a streak the user can still see they had.
 */
export function currentStreak(dayStatuses: DayStatuses, today: DayKey): number {
  let streak = 0
  let cursor = today

  if (dayStatuses.get(cursor) === 'spent') {
    cursor = addDays(cursor, -1)
  }

  while (dayStatuses.get(cursor) === 'spendFree') {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Spend-free days within the given statuses. */
export function spendFreeCount(dayStatuses: DayStatuses): number {
  let count = 0
  for (const value of dayStatuses.values()) {
    if (value === 'spendFree') count += 1
  }
  return count
}
