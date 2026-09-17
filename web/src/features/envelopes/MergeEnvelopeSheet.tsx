import { useState } from 'react'
import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { sortedEnvelopes } from '../../data/store/derive'
import { merge } from '../../data/store/ops'
import type { Id } from '../../data/types'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge } from '../../design/components/EmojiBadge'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'

interface Props {
  sourceID: Id
  onClose: () => void
  onMerged: () => void
}

/** Folds one envelope into another, moving its money and its history across. */
export function MergeEnvelopeSheet({ sourceID, onClose, onMerged }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const source = snapshot.envelopes[sourceID]
  const [destination, setDestination] = useState<Id | null>(null)
  const candidates = sortedEnvelopes(snapshot).filter((e) => e.id !== sourceID)

  if (!source) return null

  return (
    <div className="screen">
      <NavBar inSheet title="Merge envelope" leading={<NavTextButton title="Cancel" quiet onClick={onClose} />} />
      <div className="screen__body" style={{ position: 'relative' }}>
        <div className="screen__content screen__content--pinned" style={{ gap: 'var(--space-medium)' }}>
          <p className="t-callout c-secondary" style={{ margin: 0 }}>
            Everything in {source.emoji} {source.name} — its balance and its whole history — moves into the envelope you pick, and this one goes away.
          </p>
          <CardSurface>
            {candidates.map((candidate, index) => (
              <div key={candidate.id}>
                <button type="button" className="option-row" onClick={() => setDestination(candidate.id)}>
                  <EmojiBadge emoji={candidate.emoji} tint={kindColor(candidate.kind)} size={38} />
                  <span className="t-body c-primary">{candidate.name}</span>
                  <span className={`option-row__check ${destination === candidate.id ? 'option-row__check--on' : 'option-row__check--off'}`}>
                    <Icon name={destination === candidate.id ? 'checkmark.circle.fill' : 'circle'} size={22} />
                  </span>
                </button>
                {index < candidates.length - 1 ? <div className="divider" /> : null}
              </div>
            ))}
          </CardSurface>
        </div>
        <div className="pinned-actions pinned-actions--overlay">
          <PillButton
            title="merge"
            isEnabled={destination !== null}
            onClick={() => {
              if (!destination) return
              store.commit(merge(store.getSnapshot(), sourceID, destination))
              onMerged()
            }}
          />
        </div>
      </div>
    </div>
  )
}
