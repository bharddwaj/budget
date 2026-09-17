import type {
  AllocationRecord,
  BudgetCycleRecord,
  EnvelopeRecord,
  Id,
  SettingsRecord,
  Snapshot,
  TransactionRecord,
} from './types'

export interface CollectionChanges<Record> {
  put?: Record[]
  delete?: Id[]
}

/**
 * One atomic batch of writes. Every store operation produces one of these, so
 * a budget creation or a merge can never be half-applied: the in-memory
 * snapshot, IndexedDB and (later) Firestore all see the whole change or none.
 */
export interface ChangeSet {
  envelopes?: CollectionChanges<EnvelopeRecord>
  transactions?: CollectionChanges<TransactionRecord>
  allocations?: CollectionChanges<AllocationRecord>
  cycles?: CollectionChanges<BudgetCycleRecord>
  /** Whole-document replace. */
  settings?: SettingsRecord
}

/**
 * Where records live. The app holds a `Snapshot` in memory and pushes
 * `ChangeSet`s through here; the UI never talks to storage directly, which is
 * what lets a cloud backend slot in later without touching a screen.
 */
export interface BudgetRepository {
  /** Full read on launch. Creates default settings if none are stored. */
  load(): Promise<Snapshot>
  /** Applies a change set atomically. */
  apply(changes: ChangeSet): Promise<void>
  /**
   * Notifies when storage changes from elsewhere (another tab, a cloud sync).
   * The local implementation has nothing to report and returns a no-op.
   */
  subscribe(listener: (snapshot: Snapshot) => void): () => void
  /** "Delete all my data." */
  wipe(): Promise<void>
}

export function isEmptyChangeSet(changes: ChangeSet): boolean {
  const collections = [changes.envelopes, changes.transactions, changes.allocations, changes.cycles]
  return (
    changes.settings === undefined &&
    collections.every((c) => !c || ((c.put?.length ?? 0) === 0 && (c.delete?.length ?? 0) === 0))
  )
}
