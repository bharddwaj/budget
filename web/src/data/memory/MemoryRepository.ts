import { applyChangeSet } from '../changeSet'
import { emptySnapshot } from '../defaults'
import type { BudgetRepository, ChangeSet } from '../repository'
import type { Snapshot } from '../types'

/** An in-memory repository for tests and previews. */
export class MemoryRepository implements BudgetRepository {
  private snapshot: Snapshot

  constructor(initial: Snapshot = emptySnapshot()) {
    this.snapshot = initial
  }

  async load(): Promise<Snapshot> {
    return this.snapshot
  }

  async apply(changes: ChangeSet): Promise<void> {
    this.snapshot = applyChangeSet(this.snapshot, changes)
  }

  subscribe(): () => void {
    return () => {}
  }

  async wipe(): Promise<void> {
    this.snapshot = emptySnapshot()
  }
}
