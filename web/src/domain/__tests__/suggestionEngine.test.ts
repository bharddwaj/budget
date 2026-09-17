import { describe, expect, it } from 'vitest'
import { fromMajor } from '../money'
import { envelopeSnapshot, suggestion, suggestions } from '../suggestionEngine'

const today = '2026-03-01'

describe('suggestionEngine — variable', () => {
  it('is the trailing average pro-rated to one cycle', () => {
    const envelope = envelopeSnapshot({ kind: 'variable', trailingSpend: fromMajor(600), trailingWindowDays: 90 })
    // $600 over 90 days is 90/14 ≈ 6.43 biweekly budgets.
    expect(suggestion(envelope, today, 'biweekly').amount).toBe(9333)
  })

  it('tops up rather than restuffing a rollover', () => {
    const envelope = envelopeSnapshot({
      kind: 'variable',
      currentBalance: fromMajor(50),
      trailingSpend: fromMajor(600),
      trailingWindowDays: 90,
    })
    // $600 over 90 days is 90/(365/12) ≈ 2.96 monthly budgets, so about
    // $202.78 a cycle — less the $50 already sitting there.
    expect(suggestion(envelope, today, 'monthly').amount).toBe(20278 - 5000)
  })

  it('never goes negative', () => {
    const envelope = envelopeSnapshot({ kind: 'variable', currentBalance: fromMajor(5000), trailingSpend: fromMajor(600) })
    expect(suggestion(envelope, today, 'monthly').amount).toBe(0)
  })

  it('returns zero with no history and says so', () => {
    const result = suggestion(envelopeSnapshot({ kind: 'variable' }), today, 'weekly')
    expect(result.amount).toBe(0)
    expect(result.rationale).toContain('No spending here yet')
  })
})

describe('suggestionEngine — fixed', () => {
  it('splits the bill across remaining budgets', () => {
    const envelope = envelopeSnapshot({ kind: 'fixed', billAmount: fromMajor(1200), billDueDate: '2026-03-21' })
    const result = suggestion(envelope, today, 'biweekly')
    expect(result.amount).toBe(fromMajor(600))
    expect(result.rationale).toContain('2 budgets')
  })

  it('subtracts what is already stuffed', () => {
    const envelope = envelopeSnapshot({
      kind: 'fixed',
      currentBalance: fromMajor(400),
      billAmount: fromMajor(1200),
      billDueDate: '2026-03-21',
    })
    expect(suggestion(envelope, today, 'biweekly').amount).toBe(fromMajor(400))
  })

  it('covers a bill due before the next budget in full', () => {
    const envelope = envelopeSnapshot({ kind: 'fixed', billAmount: fromMajor(1200), billDueDate: '2026-03-04' })
    const result = suggestion(envelope, today, 'biweekly')
    expect(result.amount).toBe(fromMajor(1200))
    expect(result.rationale).toContain('last budget')
  })

  it('returns zero without a bill amount', () => {
    expect(suggestion(envelopeSnapshot({ kind: 'fixed' }), today, 'weekly').amount).toBe(0)
  })
})

describe('suggestionEngine — savings', () => {
  it('paces toward the deadline', () => {
    const envelope = envelopeSnapshot({
      kind: 'savings',
      currentBalance: fromMajor(200),
      goalAmount: fromMajor(1000),
      goalDeadline: '2026-03-29',
    })
    // Weekly budgets on 1, 8, 15, 22, 29 — five of them for the $800 left.
    expect(suggestion(envelope, today, 'weekly').amount).toBe(fromMajor(160))
  })

  it('suggests nothing without a deadline but reports progress', () => {
    const envelope = envelopeSnapshot({ kind: 'savings', currentBalance: fromMajor(200), goalAmount: fromMajor(1000) })
    const result = suggestion(envelope, today, 'weekly')
    expect(result.amount).toBe(0)
    expect(result.rationale).toContain('$800.00 to go')
  })

  it('suggests nothing once the goal is reached', () => {
    const envelope = envelopeSnapshot({
      kind: 'savings',
      currentBalance: fromMajor(1000),
      goalAmount: fromMajor(1000),
      goalDeadline: '2026-06-01',
    })
    const result = suggestion(envelope, today, 'weekly')
    expect(result.amount).toBe(0)
    expect(result.rationale).toContain('Goal reached')
  })
})

describe('suggestionEngine — batch', () => {
  it('keys suggestions by envelope id', () => {
    const variable = envelopeSnapshot({ kind: 'variable', trailingSpend: fromMajor(300) })
    const fixed = envelopeSnapshot({ kind: 'fixed', billAmount: fromMajor(100), billDueDate: '2026-03-15' })
    const result = suggestions([variable, fixed], today, 'weekly')
    expect(result.size).toBe(2)
    expect(result.get(variable.id)).toBeDefined()
    expect(result.get(fixed.id)).toBeDefined()
  })
})
