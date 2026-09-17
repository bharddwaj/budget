import { describe, expect, it } from 'vitest'
import {
  activeCycle,
  daysUntilNextBudget,
  goalProgress,
  isBillOutstanding,
  isBudgetDue,
  remainingFraction,
  suggestionSnapshot,
} from '../derive'
import { createBudget, record } from '../ops'
import { apply, clock, seeded } from './fixtures'

describe('remainingFraction', () => {
  it('is full for an unstuffed positive balance, empty at zero, and drains as you spend', () => {
    const { snapshot, groceries } = seeded()
    expect(remainingFraction(snapshot, snapshot.envelopes[groceries.id]!, null)).toBe(0)

    const budget = createBudget(snapshot, 40000, 'biweekly', '2026-09-10', '2026-09-24', [
      { envelopeID: groceries.id, amount: 40000, suggested: 0 },
    ], clock)
    let next = apply(snapshot, budget.changes)
    const cycle = activeCycle(next)
    expect(remainingFraction(next, next.envelopes[groceries.id]!, cycle)).toBe(1)

    next = apply(next, record(next, { amount: 10000, kind: 'expense', date: '2026-09-11', envelopeID: groceries.id }, clock).changes)
    expect(remainingFraction(next, next.envelopes[groceries.id]!, cycle)).toBe(0.75)
  })
})

describe('goalProgress / isBillOutstanding', () => {
  it('computes goal progress for savings only', () => {
    const { snapshot, trip, groceries } = seeded()
    const next = apply(snapshot, record(snapshot, { amount: 25000, kind: 'income', date: '2026-09-10', envelopeID: trip.id }, clock).changes)
    expect(goalProgress(next.envelopes[trip.id]!)).toBe(0.25)
    expect(goalProgress(next.envelopes[groceries.id]!)).toBeNull()
  })

  it('flags a bill as outstanding once due and unpaid', () => {
    const { snapshot, rent } = seeded()
    const envelope = snapshot.envelopes[rent.id]!
    expect(isBillOutstanding(envelope, '2026-09-24')).toBe(false)
    expect(isBillOutstanding(envelope, '2026-09-25')).toBe(true)
    expect(isBillOutstanding({ ...envelope, lastPaidOn: '2026-09-25' }, '2026-09-26')).toBe(false)
    expect(isBillOutstanding({ ...envelope, lastPaidOn: '2026-09-01' }, '2026-09-26')).toBe(true)
  })
})

describe('suggestionSnapshot', () => {
  it('sums expenses in the trailing 90 days only', () => {
    const { snapshot, groceries } = seeded()
    let next = snapshot
    for (const date of ['2026-06-11', '2026-06-13', '2026-09-10']) {
      next = apply(next, record(next, { amount: 1000, kind: 'expense', date, envelopeID: groceries.id }, clock).changes)
    }
    // 2026-06-12 is 90 days before 2026-09-10, so the 11th falls outside.
    expect(suggestionSnapshot(next, next.envelopes[groceries.id]!, '2026-09-10').trailingSpend).toBe(2000)
  })
})

describe('cycle helpers', () => {
  it('knows when a budget is due', () => {
    const { snapshot, groceries } = seeded()
    const budget = createBudget(snapshot, 0, 'biweekly', '2026-09-10', '2026-09-24', [
      { envelopeID: groceries.id, amount: 0, suggested: 0 },
    ], clock)
    expect(isBudgetDue(budget.cycle, '2026-09-23')).toBe(false)
    expect(isBudgetDue(budget.cycle, '2026-09-24')).toBe(true)
    expect(daysUntilNextBudget(budget.cycle, '2026-09-10')).toBe(14)
    expect(daysUntilNextBudget(budget.cycle, '2026-09-26')).toBe(-2)
  })
})
