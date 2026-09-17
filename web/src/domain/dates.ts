/**
 * Calendar-day arithmetic on `'YYYY-MM-DD'` keys.
 *
 * Everything the app stores is day-granular (transaction dates, due dates,
 * budget dates), so days are kept as sortable strings and only turned into
 * `Date` objects at the edges — formatting for display and reading the clock.
 * Arithmetic runs on UTC midnights so daylight-saving changes can never shift a
 * day, which is the class of bug this module exists to rule out.
 */
export type DayKey = string

const MS_PER_DAY = 86_400_000

export interface DayParts {
  year: number
  month: number
  day: number
}

export function parseDay(key: DayKey): DayParts {
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7))
  const day = Number(key.slice(8, 10))
  return { year, month, day }
}

export function dayKey(year: number, month: number, day: number): DayKey {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** The local calendar day a `Date` falls on. */
export function keyFromDate(date: Date): DayKey {
  return dayKey(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function todayKey(now: Date = new Date()): DayKey {
  return keyFromDate(now)
}

/** A local-midnight `Date` for formatting; never stored. */
export function dateFromKey(key: DayKey): Date {
  const { year, month, day } = parseDay(key)
  return new Date(year, month - 1, day)
}

function utcMillis(key: DayKey): number {
  const { year, month, day } = parseDay(key)
  return Date.UTC(year, month - 1, day)
}

function keyFromUTC(millis: number): DayKey {
  const date = new Date(millis)
  return dayKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function addDays(key: DayKey, days: number): DayKey {
  return keyFromUTC(utcMillis(key) + days * MS_PER_DAY)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Adds calendar months, pulling the day back to the last day of the target
 * month when it is short (Jan 31 → Feb 28), as Foundation's calendar does.
 */
export function addMonths(key: DayKey, months: number): DayKey {
  const { year, month, day } = parseDay(key)
  const zeroBased = month - 1 + months
  const targetYear = year + Math.floor(zeroBased / 12)
  const targetMonth = ((zeroBased % 12) + 12) % 12 + 1
  return dayKey(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)))
}

export function addYears(key: DayKey, years: number): DayKey {
  return addMonths(key, years * 12)
}

/** Whole days from `start` to `end`, negative when `end` precedes `start`. */
export function daysBetween(start: DayKey, end: DayKey): number {
  return Math.round((utcMillis(end) - utcMillis(start)) / MS_PER_DAY)
}

export function compareDays(lhs: DayKey, rhs: DayKey): number {
  return lhs < rhs ? -1 : lhs > rhs ? 1 : 0
}

export function minDay(lhs: DayKey, rhs: DayKey): DayKey {
  return lhs < rhs ? lhs : rhs
}

export function maxDay(lhs: DayKey, rhs: DayKey): DayKey {
  return lhs > rhs ? lhs : rhs
}

export function startOfMonth(key: DayKey): DayKey {
  const { year, month } = parseDay(key)
  return dayKey(year, month, 1)
}

export function endOfMonth(key: DayKey): DayKey {
  const { year, month } = parseDay(key)
  return dayKey(year, month, daysInMonth(year, month))
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(key: DayKey): number {
  return new Date(utcMillis(key)).getUTCDay()
}

/** Every day from `start` through `end` inclusive. */
export function eachDay(start: DayKey, end: DayKey): DayKey[] {
  const days: DayKey[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
}

// MARK: - Display

export type DayStyle =
  | 'monthDay' // Sep 25
  | 'monthDayYear' // Sep 25, 2026
  | 'weekdayMonthDay' // Wed, Sep 24
  | 'longWeekdayMonthDay' // Wednesday, September 24
  | 'monthYear' // September 2026

const styleOptions: Record<DayStyle, Intl.DateTimeFormatOptions> = {
  monthDay: { month: 'short', day: 'numeric' },
  monthDayYear: { month: 'short', day: 'numeric', year: 'numeric' },
  weekdayMonthDay: { weekday: 'short', month: 'short', day: 'numeric' },
  longWeekdayMonthDay: { weekday: 'long', month: 'long', day: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
}

export function formatDay(key: DayKey, style: DayStyle, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, styleOptions[style]).format(dateFromKey(key))
}

/** Very short weekday symbols starting on Sunday: S M T W T F S. */
export function weekdaySymbols(locale = 'en-US'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  // 2023-01-01 was a Sunday.
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => formatter.format(new Date(2023, 0, 1 + offset)))
}
