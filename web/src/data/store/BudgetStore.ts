import { todayKey } from '../../domain/dates'
import { applyChangeSet } from '../changeSet'
import { emptySnapshot } from '../defaults'
import { isEmptyChangeSet, type BudgetRepository, type ChangeSet } from '../repository'
import type { Snapshot } from '../types'
import type { Clock } from './ops'

type Listener = () => void

/**
 * The app's single source of truth.
 *
 * Holds the current `Snapshot` in memory, applies each change set to it
 * synchronously (so the UI updates instantly, like SwiftData's main context),
 * then persists the same change set through the repository on a serial queue.
 * Views subscribe through `useSyncExternalStore`; every write goes through
 * `commit` with a change set produced by a pure function in `ops.ts`.
 */
export class BudgetStore {
  private snapshot: Snapshot = emptySnapshot()
  private listeners = new Set<Listener>()
  private queue: Promise<void> = Promise.resolve()
  private loaded = false
  private unsubscribeRepository: (() => void) | null = null
  private readonly repository: BudgetRepository

  constructor(repository: BudgetRepository) {
    this.repository = repository
  }

  async load(): Promise<void> {
    this.snapshot = await this.repository.load()
    this.loaded = true
    this.unsubscribeRepository = this.repository.subscribe((snapshot) => this.replace(snapshot))
    this.notify()
  }

  get isLoaded(): boolean {
    return this.loaded
  }

  getSnapshot = (): Snapshot => this.snapshot

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  clock(): Clock {
    const now = new Date()
    return { today: todayKey(now), now: now.getTime() }
  }

  /** Applies a change set to memory now and to storage as soon as the queue allows. */
  commit(changes: ChangeSet): void {
    if (isEmptyChangeSet(changes)) return
    this.snapshot = applyChangeSet(this.snapshot, changes)
    this.notify()
    this.queue = this.queue
      .then(() => this.repository.apply(changes))
      .catch(async (error: unknown) => {
        console.error('Failed to persist changes; reloading from storage.', error)
        this.snapshot = await this.repository.load()
        this.notify()
      })
  }

  /** Waits for every queued write to reach storage. */
  flush(): Promise<void> {
    return this.queue
  }

  /** Replaces the whole snapshot, e.g. after a remote sync. */
  replace(snapshot: Snapshot): void {
    this.snapshot = snapshot
    this.notify()
  }

  async wipe(): Promise<void> {
    await this.flush()
    await this.repository.wipe()
    this.snapshot = await this.repository.load()
    this.notify()
  }

  dispose(): void {
    this.unsubscribeRepository?.()
    this.unsubscribeRepository = null
  }

  private notify(): void {
    for (const listener of this.listeners) listener()
  }
}
