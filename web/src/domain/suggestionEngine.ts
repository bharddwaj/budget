import type { BudgetFrequency } from './budgetFrequency'
import { formatMoney, USD, type CurrencyFormat } from './currencyFormat'
import { approximateCycles, budgetsRemaining } from './cycleCalendar'
import type { DayKey } from './dates'
import type { EnvelopeKind } from './envelopeKind'
import { clampedToZero, divide, type Money } from './money'

/** "The past 3 months" from the help centre. */
export const TRAILING_WINDOW_DAYS = 90

/**
 * A plain-data view of one envelope, assembled from the store by the app and
 * from literals by the tests.
 */
export interface EnvelopeSnapshot {
  id: string
  kind: EnvelopeKind
  /** What is left in the envelope right now, before this budget stuffs it. */
  currentBalance: Money
  // Fixed envelopes
  billAmount: Money | null
  billDueDate: DayKey | null
  // Savings envelopes
  goalAmount: Money | null
  goalDeadline: DayKey | null
  /** Total spent from this envelope over `trailingWindowDays`. */
  trailingSpend: Money
  trailingWindowDays: number
}

export function envelopeSnapshot(
  overrides: Partial<EnvelopeSnapshot> & Pick<EnvelopeSnapshot, 'kind'>,
): EnvelopeSnapshot {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    kind: overrides.kind,
    currentBalance: overrides.currentBalance ?? 0,
    billAmount: overrides.billAmount ?? null,
    billDueDate: overrides.billDueDate ?? null,
    goalAmount: overrides.goalAmount ?? null,
    goalDeadline: overrides.goalDeadline ?? null,
    trailingSpend: overrides.trailingSpend ?? 0,
    trailingWindowDays: overrides.trailingWindowDays ?? TRAILING_WINDOW_DAYS,
  }
}

/**
 * A suggestion plus the sentence shown under the keypad explaining where the
 * number came from — the app never presents a suggested amount without saying
 * why.
 */
export interface Suggestion {
  amount: Money
  rationale: string
}

/**
 * Computes the amount behind the keypad's `suggested` button.
 *
 * - **variable** — the average spent in that envelope over the past 3 months,
 *   pro-rated to one budget cycle.
 * - **fixed** — the bill total divided by the number of budgets between now and
 *   its due date.
 * - **savings** — the goal divided by the number of budgets before the deadline.
 *
 * Each rule then subtracts whatever is already sitting in the envelope, so an
 * envelope carrying a rollover is topped up rather than stuffed a second time.
 */
export function suggestion(
  envelope: EnvelopeSnapshot,
  asOf: DayKey,
  frequency: BudgetFrequency,
  format: CurrencyFormat = USD,
): Suggestion {
  switch (envelope.kind) {
    case 'variable':
      return variableSuggestion(envelope, frequency, format)
    case 'fixed':
      return fixedSuggestion(envelope, asOf, frequency, format)
    case 'savings':
      return savingsSuggestion(envelope, asOf, frequency, format)
  }
}

/** Convenience for the stuffing screen, which needs the whole set at once. */
export function suggestions(
  envelopes: EnvelopeSnapshot[],
  asOf: DayKey,
  frequency: BudgetFrequency,
  format: CurrencyFormat = USD,
): Map<string, Suggestion> {
  const result = new Map<string, Suggestion>()
  for (const envelope of envelopes) {
    result.set(envelope.id, suggestion(envelope, asOf, frequency, format))
  }
  return result
}

function variableSuggestion(
  envelope: EnvelopeSnapshot,
  frequency: BudgetFrequency,
  format: CurrencyFormat,
): Suggestion {
  if (envelope.trailingSpend <= 0) {
    return {
      amount: 0,
      rationale: "No spending here yet — stuff what feels right and we'll learn from it.",
    }
  }

  const cycles = approximateCycles(envelope.trailingWindowDays, frequency)
  // Swift's `.rounded()` is half away from zero; trailing spend is positive
  // here so Math.round agrees.
  const perCycle = Math.round(envelope.trailingSpend / cycles)
  const topUp = clampedToZero(perCycle - envelope.currentBalance)

  return {
    amount: topUp,
    rationale: `You spend about ${formatMoney(format, perCycle)} here each budget.`,
  }
}

function fixedSuggestion(
  envelope: EnvelopeSnapshot,
  asOf: DayKey,
  frequency: BudgetFrequency,
  format: CurrencyFormat,
): Suggestion {
  const bill = envelope.billAmount
  if (bill === null || bill <= 0) {
    return { amount: 0, rationale: 'Add a bill amount and due date to get a suggestion.' }
  }

  const outstanding = clampedToZero(bill - envelope.currentBalance)
  if (envelope.billDueDate === null) {
    return { amount: outstanding, rationale: 'No due date set, so this covers the full bill now.' }
  }

  const budgets = budgetsRemaining(asOf, envelope.billDueDate, frequency)
  const amount = divide(outstanding, budgets)

  if (budgets === 1) {
    return { amount, rationale: "This is your last budget before it's due — cover it now." }
  }
  return {
    amount,
    rationale: `${formatMoney(format, outstanding)} left to cover, across ${budgets} budgets.`,
  }
}

function savingsSuggestion(
  envelope: EnvelopeSnapshot,
  asOf: DayKey,
  frequency: BudgetFrequency,
  format: CurrencyFormat,
): Suggestion {
  const goal = envelope.goalAmount
  if (goal === null || goal <= 0) {
    return { amount: 0, rationale: 'Set a goal amount to get a suggestion.' }
  }

  const remaining = clampedToZero(goal - envelope.currentBalance)
  if (remaining <= 0) {
    return { amount: 0, rationale: 'Goal reached — nothing more needed.' }
  }

  if (envelope.goalDeadline === null) {
    return {
      amount: 0,
      rationale: `${formatMoney(format, remaining)} to go. Add a deadline for a pace.`,
    }
  }

  const budgets = budgetsRemaining(asOf, envelope.goalDeadline, frequency)
  const amount = divide(remaining, budgets)
  return {
    amount,
    rationale: `${formatMoney(format, remaining)} to go, across ${budgets} budgets.`,
  }
}
