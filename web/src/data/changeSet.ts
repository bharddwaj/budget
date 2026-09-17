import type { ChangeSet, CollectionChanges } from './repository'
import type { Id, Snapshot } from './types'

/** Applies a change set to an in-memory snapshot, returning a new snapshot. */
export function applyChangeSet(snapshot: Snapshot, changes: ChangeSet): Snapshot {
  return {
    settings: changes.settings ?? snapshot.settings,
    envelopes: applyCollection(snapshot.envelopes, changes.envelopes),
    transactions: applyCollection(snapshot.transactions, changes.transactions),
    allocations: applyCollection(snapshot.allocations, changes.allocations),
    cycles: applyCollection(snapshot.cycles, changes.cycles),
  }
}

function applyCollection<Record extends { id: Id }>(
  current: globalThis.Record<Id, Record>,
  changes: CollectionChanges<Record> | undefined,
): globalThis.Record<Id, Record> {
  if (!changes) return current
  const next = { ...current }
  for (const id of changes.delete ?? []) delete next[id]
  for (const record of changes.put ?? []) next[record.id] = record
  return next
}

/** Merges several change sets in order; later puts win, deletes accumulate. */
export function mergeChangeSets(...sets: ChangeSet[]): ChangeSet {
  const merged: ChangeSet = {}
  for (const set of sets) {
    if (set.settings) merged.settings = set.settings
    merged.envelopes = mergeCollection(merged.envelopes, set.envelopes)
    merged.transactions = mergeCollection(merged.transactions, set.transactions)
    merged.allocations = mergeCollection(merged.allocations, set.allocations)
    merged.cycles = mergeCollection(merged.cycles, set.cycles)
  }
  return merged
}

function mergeCollection<Record extends { id: Id }>(
  base: CollectionChanges<Record> | undefined,
  extra: CollectionChanges<Record> | undefined,
): CollectionChanges<Record> | undefined {
  if (!extra) return base
  if (!base) return extra
  const deletes = new Set([...(base.delete ?? []), ...(extra.delete ?? [])])
  const puts = new Map<Id, Record>()
  for (const record of base.put ?? []) puts.set(record.id, record)
  for (const record of extra.put ?? []) puts.set(record.id, record)
  // A record put after being deleted in an earlier set is a real put.
  for (const record of extra.put ?? []) deletes.delete(record.id)
  // A record deleted after being put is a real delete.
  for (const id of extra.delete ?? []) puts.delete(id)
  return { put: [...puts.values()], delete: [...deletes] }
}
