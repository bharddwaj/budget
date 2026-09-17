/**
 * How often a budget is run, matching the four options on the schedule screen:
 * "every week, every second week, twice a month, or once a month".
 */
export type BudgetFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

export const BUDGET_FREQUENCIES: readonly BudgetFrequency[] = [
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly',
]

/** The label shown on the schedule screen's option rows. */
export function frequencyTitle(frequency: BudgetFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'Every week'
    case 'biweekly':
      return 'Every second week'
    case 'semimonthly':
      return 'Twice a month'
    case 'monthly':
      return 'Once a month'
  }
}

/** Short form for banners and summaries, e.g. "budgeting weekly". */
export function frequencyAdverb(frequency: BudgetFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'weekly'
    case 'biweekly':
      return 'every 2 weeks'
    case 'semimonthly':
      return 'twice a month'
    case 'monthly':
      return 'monthly'
  }
}

/**
 * Average length of one cycle in days. Used only where an approximation is
 * acceptable — pro-rating a trailing spending average, for example. Exact date
 * stepping always goes through `cycleCalendar`.
 */
export function approximateDayLength(frequency: BudgetFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 7
    case 'biweekly':
      return 14
    case 'semimonthly':
      return 365 / 24
    case 'monthly':
      return 365 / 12
  }
}

/** How many budgets fall in a calendar year. */
export function budgetsPerYear(frequency: BudgetFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 52
    case 'biweekly':
      return 26
    case 'semimonthly':
      return 24
    case 'monthly':
      return 12
  }
}
