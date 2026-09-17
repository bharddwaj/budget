import { describe, expect, it } from 'vitest'
import { currentStreak, spendFreeCount, statuses, type SpendEvent } from '../noSpendEvaluator'

const groceries = 'groceries'
const rent = 'rent'

function evaluate(
  events: SpendEvent[],
  offLimits: string[],
  trackingStart: string | null = '2026-03-01',
  today = '2026-03-05',
) {
  return statuses('2026-03-01', '2026-03-07', events, new Set(offLimits), trackingStart, today)
}

describe('noSpendEvaluator', () => {
  it('spending from an off-limits envelope turns the day red', () => {
    const result = evaluate([{ date: '2026-03-03', envelopeID: groceries, isExpense: true }], [groceries])
    expect(result.get('2026-03-03')).toBe('spent')
    expect(result.get('2026-03-02')).toBe('spendFree')
  })

  it('spending from an allowed envelope leaves the day green', () => {
    const result = evaluate([{ date: '2026-03-03', envelopeID: rent, isExpense: true }], [groceries])
    expect(result.get('2026-03-03')).toBe('spendFree')
  })

  it('income and transfers never break a day', () => {
    const result = evaluate([{ date: '2026-03-03', envelopeID: groceries, isExpense: false }], [groceries])
    expect(result.get('2026-03-03')).toBe('spendFree')
  })

  it('future days are upcoming and pre-tracking days are untracked', () => {
    const result = statuses('2026-02-25', '2026-03-07', [], new Set([groceries]), '2026-03-01', '2026-03-05')
    expect(result.get('2026-02-26')).toBe('untracked')
    expect(result.get('2026-03-05')).toBe('spendFree')
    expect(result.get('2026-03-06')).toBe('upcoming')
  })

  it('streak counts back from today', () => {
    const result = evaluate([{ date: '2026-03-02', envelopeID: groceries, isExpense: true }], [groceries])
    // 3rd, 4th and 5th are clean; the 2nd broke it.
    expect(currentStreak(result, '2026-03-05')).toBe(3)
  })

  it('streak falls back to yesterday when today is already broken', () => {
    const result = evaluate([{ date: '2026-03-05', envelopeID: groceries, isExpense: true }], [groceries])
    expect(currentStreak(result, '2026-03-05')).toBe(4)
  })

  it('counts spend-free days', () => {
    const result = evaluate([{ date: '2026-03-04', envelopeID: groceries, isExpense: true }], [groceries])
    // 1st through 5th are tracked, one of them red.
    expect(spendFreeCount(result)).toBe(4)
  })
})
