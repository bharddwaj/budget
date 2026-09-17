import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { emptySnapshot } from '../../defaults'
import { BudgetDatabase } from '../../dexie/BudgetDatabase'
import { DexieRepository } from '../../dexie/DexieRepository'
import { createEnvelope, record } from '../ops'
import { apply, clock } from './fixtures'

function freshRepository(): DexieRepository {
  return new DexieRepository(new BudgetDatabase(`test-${crypto.randomUUID()}`))
}

describe('DexieRepository', () => {
  it('creates default settings on first load', async () => {
    const repo = freshRepository()
    const snapshot = await repo.load()
    expect(snapshot.settings.hasOnboarded).toBe(false)
    expect(snapshot.settings.currencySymbol).toBe('$')
  })

  it('round-trips a change set', async () => {
    const repo = freshRepository()
    let snapshot = await repo.load()
    const created = createEnvelope(snapshot, '🛒', 'Groceries', 'variable', clock)
    await repo.apply(created.changes)
    snapshot = apply(snapshot, created.changes)
    const recorded = record(snapshot, { amount: 1234, kind: 'expense', date: '2026-09-10', envelopeID: created.envelope.id }, clock)
    await repo.apply(recorded.changes)

    const reloaded = await repo.load()
    expect(reloaded.envelopes[created.envelope.id]!.balanceMinorUnits).toBe(-1234)
    expect(reloaded.transactions[recorded.transaction.id]!.amountMinorUnits).toBe(1234)
  })

  it('applies a change set atomically', async () => {
    const repo = freshRepository()
    await repo.load()
    const created = createEnvelope(emptySnapshot(), '🛒', 'Groceries', 'variable', clock)
    // A record without a primary key makes bulkPut throw; nothing else in the
    // same change set may land.
    const broken = { ...created.envelope, id: undefined as unknown as string }
    await expect(
      repo.apply({ envelopes: { put: [created.envelope, broken] }, settings: { ...emptySnapshot().settings, hasOnboarded: true } }),
    ).rejects.toBeDefined()
    const reloaded = await repo.load()
    expect(Object.keys(reloaded.envelopes)).toHaveLength(0)
    expect(reloaded.settings.hasOnboarded).toBe(false)
  })

  it('wipes everything', async () => {
    const repo = freshRepository()
    const snapshot = await repo.load()
    await repo.apply(createEnvelope(snapshot, '🛒', 'Groceries', 'variable', clock).changes)
    await repo.wipe()
    const reloaded = await repo.load()
    expect(Object.keys(reloaded.envelopes)).toHaveLength(0)
  })
})
