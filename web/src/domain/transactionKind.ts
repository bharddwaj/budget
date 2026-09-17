import { addDays, addMonths, addYears, type DayKey } from './dates'
import type { Money } from './money'

/**
 * What a transaction did to an envelope.
 *
 * Transfers are stored as a pair of rows sharing a `transferGroupID`, which
 * keeps every row a simple signed movement.
 */
export type TransactionKind =
  | 'expense'
  | 'income'
  | 'transferOut'
  | 'transferIn'
  /** Money placed into the envelope by a budget. */
  | 'stuffing'
  /** Money a budget took back out — what "empty" and a lowered target do. */
  | 'unstuffing'

/** The two options offered on the add-transaction sheet. */
export const USER_SELECTABLE_KINDS: readonly TransactionKind[] = ['expense', 'income']

/** True when the amount reduces the envelope's balance. */
export function isOutflow(kind: TransactionKind): boolean {
  return kind === 'expense' || kind === 'transferOut' || kind === 'unstuffing'
}

/** Only real expenses can break a spend-free day. */
export function countsAsSpending(kind: TransactionKind): boolean {
  return kind === 'expense'
}

export function transactionKindTitle(kind: TransactionKind): string {
  switch (kind) {
    case 'expense':
      return 'Expense'
    case 'income':
      return 'Income'
    case 'transferOut':
      return 'Transfer out'
    case 'transferIn':
      return 'Transfer in'
    case 'stuffing':
      return 'Stuffed'
    case 'unstuffing':
      return 'Unstuffed'
  }
}

/** Outflows are negative when summed into a balance, everything else positive. */
export function signedAmount(kind: TransactionKind, amount: Money): Money {
  const size = Math.abs(amount)
  return isOutflow(kind) ? -size : size
}

/** How often a recurring expense or a fixed bill repeats. */
export type RecurrenceRule = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'

export const RECURRENCE_RULES: readonly RecurrenceRule[] = [
  'none',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]

/** The rules a bill can carry — everything except "doesn't repeat". */
export const BILL_RECURRENCES: readonly RecurrenceRule[] = RECURRENCE_RULES.filter(
  (rule) => rule !== 'none',
)

export function recurrenceTitle(rule: RecurrenceRule): string {
  switch (rule) {
    case 'none':
      return "Doesn't repeat"
    case 'weekly':
      return 'Every week'
    case 'biweekly':
      return 'Every 2 weeks'
    case 'monthly':
      return 'Every month'
    case 'quarterly':
      return 'Every 3 months'
    case 'yearly':
      return 'Every year'
  }
}

/** The next occurrence after `day`, or null when the rule does not repeat. */
export function nextRecurrence(rule: RecurrenceRule, day: DayKey): DayKey | null {
  switch (rule) {
    case 'none':
      return null
    case 'weekly':
      return addDays(day, 7)
    case 'biweekly':
      return addDays(day, 14)
    case 'monthly':
      return addMonths(day, 1)
    case 'quarterly':
      return addMonths(day, 3)
    case 'yearly':
      return addYears(day, 1)
  }
}

/** The light/dark choice in settings. */
export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

export function themeTitle(theme: ThemePreference): string {
  switch (theme) {
    case 'system':
      return 'Match my phone'
    case 'light':
      return 'Light'
    case 'dark':
      return 'Dark'
  }
}
