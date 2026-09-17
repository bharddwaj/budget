import { describe, expect, it } from 'vitest'
import { approximateCycles, budgetDates, budgetsRemaining, daysBetween, nextBudgetDate } from '../cycleCalendar'

describe('cycleCalendar', () => {
  it('steps weekly and biweekly', () => {
    expect(nextBudgetDate('2026-03-05', 'weekly')).toBe('2026-03-12')
    expect(nextBudgetDate('2026-03-05', 'biweekly')).toBe('2026-03-19')
  })

  it('monthly stepping clamps short months', () => {
    expect(nextBudgetDate('2026-01-15', 'monthly')).toBe('2026-02-15')
    // 2026 is not a leap year, so the 31st pulls back to the 28th.
    expect(nextBudgetDate('2026-01-31', 'monthly')).toBe('2026-02-28')
  })

  it('semimonthly pairs halves of the month instead of drifting', () => {
    expect(nextBudgetDate('2026-03-03', 'semimonthly')).toBe('2026-03-18')
    expect(nextBudgetDate('2026-03-18', 'semimonthly')).toBe('2026-04-03')
    // Two steps must land back on the starting day of the next month.
    const first = nextBudgetDate('2026-05-10', 'semimonthly')
    expect(nextBudgetDate(first, 'semimonthly')).toBe('2026-06-10')
  })

  it('semimonthly clamps into short months', () => {
    // The 31st pairs with the 16th of the next month, not a 46th.
    expect(nextBudgetDate('2026-01-31', 'semimonthly')).toBe('2026-02-16')
  })

  it('budget dates include the start and stop at the end', () => {
    expect(budgetDates('2026-03-01', 'weekly', '2026-03-22')).toEqual([
      '2026-03-01',
      '2026-03-08',
      '2026-03-15',
      '2026-03-22',
    ])
  })

  it("budgetsRemaining counts today's budget", () => {
    // Bill due 20 days out on a biweekly schedule: today, and the one in 14 days.
    expect(budgetsRemaining('2026-03-01', '2026-03-21', 'biweekly')).toBe(2)
  })

  it('a bill due before the next budget must be funded in full', () => {
    expect(budgetsRemaining('2026-03-01', '2026-03-04', 'biweekly')).toBe(1)
  })

  it('an overdue target still returns one', () => {
    expect(budgetsRemaining('2026-03-10', '2026-03-01', 'weekly')).toBe(1)
  })

  it('counts days between', () => {
    expect(daysBetween('2026-03-01', '2026-03-11')).toBe(10)
    expect(daysBetween('2026-03-11', '2026-03-01')).toBe(-10)
  })

  it('approximates cycles in a trailing window', () => {
    expect(approximateCycles(90, 'biweekly')).toBe(90 / 14)
    // Never returns less than one cycle, so an average is never inflated.
    expect(approximateCycles(3, 'monthly')).toBe(1)
  })
})
