import { useState } from 'react'
import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { sortedEnvelopes } from '../../data/store/derive'
import { reorder, setRetired } from '../../data/store/ops'
import type { EnvelopeRecord } from '../../data/types'
import { ENVELOPE_KIND_ORDER, kindSectionTitle } from '../../domain/envelopeKind'
import { Icon } from '../../design/Icon'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { NavBar, NavTextButton } from '../../design/components/NavBar'

interface Props {
  onClose: () => void
}

/** Reorder envelopes within their type group; show and unretire retired ones. */
export function ArrangeEnvelopesSheet({ onClose }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const [showsRetired, setShowsRetired] = useState(false)
  const all = sortedEnvelopes(snapshot, true)
  const retiredCount = all.filter((e) => e.isRetired).length

  function move(group: EnvelopeRecord[], index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= group.length) return
    const ordered = [...group]
    const [item] = ordered.splice(index, 1)
    ordered.splice(target, 0, item!)
    store.commit(reorder(store.getSnapshot(), ordered.map((e) => e.id)))
  }

  return (
    <div className="screen">
      <NavBar inSheet title="Arrange envelopes" trailing={<NavTextButton title="Done" onClick={onClose} />} />
      <div className="screen__body">
        <div className="screen__content screen__content--no-tabs">
          {ENVELOPE_KIND_ORDER.map((kind) => {
            const active = all.filter((e) => e.kind === kind && !e.isRetired)
            if (active.length === 0) return null
            return (
              <div key={kind} className="vstack" style={{ gap: 'var(--space-small)' }}>
                <SectionHeader title={kindSectionTitle(kind)} />
                <CardSurface>
                  {active.map((envelope, index) => (
                    <div key={envelope.id}>
                      <div className="arrange-row">
                        <span className="emoji">{envelope.emoji}</span>
                        <span className="t-body c-primary">{envelope.name}</span>
                        <span className="arrange-row__buttons">
                          <button type="button" className="arrange-row__nudge" aria-label="Move up" disabled={index === 0} onClick={() => move(active, index, -1)}>
                            <Icon name="chevron.left" size={18} style={{ transform: 'rotate(90deg)' }} />
                          </button>
                          <button type="button" className="arrange-row__nudge" aria-label="Move down" disabled={index === active.length - 1} onClick={() => move(active, index, 1)}>
                            <Icon name="chevron.right" size={18} style={{ transform: 'rotate(90deg)' }} />
                          </button>
                        </span>
                      </div>
                      {index < active.length - 1 ? <div className="divider" /> : null}
                    </div>
                  ))}
                </CardSurface>
              </div>
            )
          })}

          {retiredCount > 0 ? (
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <button type="button" className="t-caption c-accent" style={{ textAlign: 'left' }} onClick={() => setShowsRetired((s) => !s)}>
                {showsRetired ? 'Hide retired' : `Show retired (${retiredCount})`}
              </button>
              {showsRetired ? (
                <CardSurface>
                  {all
                    .filter((e) => e.isRetired)
                    .map((envelope, index, list) => (
                      <div key={envelope.id}>
                        <div className="arrange-row">
                          <span className="emoji">{envelope.emoji}</span>
                          <span className="t-body c-primary">{envelope.name}</span>
                          <button type="button" className="arrange-row__link" onClick={() => store.commit(setRetired(store.getSnapshot(), envelope.id, false))}>
                            Unretire
                          </button>
                        </div>
                        {index < list.length - 1 ? <div className="divider" /> : null}
                      </div>
                    ))}
                </CardSurface>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
