import { approximateDayLength, type BudgetFrequency } from './budgetFrequency'
import { addDays, addMonths, daysBetween, daysInMonth, dayKey, parseDay, type DayKey } from './dates'

/**
 * All budget-date arithmetic: when the next budget lands, and how many budgets
 * stand between now and a bill's due date or a savings deadline. The
 * suggestion formulas depend entirely on that second question, so this module
 * is deliberately small, pure and heavily tested.
 */

/**
 * The budget date that follows `day` for the given frequency.
 *
 * "Twice a month" is stepped as a half-month pairing rather than a flat 15
 * days, so a budget on the 3rd pairs with the 18th and then returns to the 3rd
 * of the next month instead of drifting through the calendar.
 */
export function nextBudgetDate(day: DayKey, frequency: BudgetFrequency): DayKey {
  switch (frequency) {
    case 'weekly':
      return addDays(day, 7)
    case 'biweekly':
      return addDays(day, 14)
    case 'monthly':
      return addMonths(day, 1)
    case 'semimonthly':
      return nextSemimonthlyDate(day)
  }
}

function nextSemimonthlyDate(day: DayKey): DayKey {
  const dayOfMonth = parseDay(day).day
  if (dayOfMonth <= 15) {
    return clampedDate(day, 0, dayOfMonth + 15)
  }
  return clampedDate(day, 1, dayOfMonth - 15)
}

/**
 * Builds a date `monthOffset` months away on `day`, pulling back to the last
 * day of that month when it is short (day 31 in a 30-day month).
 */
function clampedDate(reference: DayKey, monthOffset: number, day: number): DayKey {
  const shifted = parseDay(addMonths(reference, monthOffset))
  const lastDay = daysInMonth(shifted.year, shifted.month)
  return dayKey(shifted.year, shifted.month, Math.min(day, lastDay))
}

/**
 * Every budget date from `start` (inclusive) up to and including `end`.
 * Capped at `limit` dates so a far-future deadline cannot spin forever.
 */
export function budgetDates(
  start: DayKey,
  frequency: BudgetFrequency,
  end: DayKey,
  limit = 600,
): DayKey[] {
  if (end < start) return [start]

  const dates: DayKey[] = [start]
  let cursor = start
  while (dates.length < limit) {
    const next = nextBudgetDate(cursor, frequency)
    if (!(next > cursor) || next > end) break
    dates.push(next)
    cursor = next
  }
  return dates
}

/**
 * How many budgets — counting the one being run right now — fall on or before
 * `target`. A bill due before the next budget must be funded in full today, so
 * the result is never less than 1.
 */
export function budgetsRemaining(
  start: DayKey,
  target: DayKey,
  frequency: BudgetFrequency,
): number {
  if (target < start) return 1
  return Math.max(1, budgetDates(start, frequency, target).length)
}

/** Roughly how many budget cycles fit in a span of days. */
export function approximateCycles(days: number, frequency: BudgetFrequency): number {
  if (days <= 0) return 1
  return Math.max(1, days / approximateDayLength(frequency))
}

export { daysBetween }
