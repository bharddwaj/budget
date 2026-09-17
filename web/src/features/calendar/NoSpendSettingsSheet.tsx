import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { sortedEnvelopes } from '../../data/store/derive'
import { updateEnvelope } from '../../data/store/ops'
import { CardSurface } from '../../design/components/CardSurface'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { Toggle } from '../../design/components/Toggle'

/** Which envelopes count against a spend-free day. */
export function NoSpendSettingsSheet({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const snapshot = useSnapshot()
  const envelopes = sortedEnvelopes(snapshot)
  return (
    <div className="screen">
      <NavBar inSheet title="Spend-free days" trailing={<NavTextButton title="Done" onClick={onClose} />} />
      <div className="screen__body">
        <div className="screen__content screen__content--no-tabs" style={{ gap: 'var(--space-medium)' }}>
          <p className="t-callout c-secondary" style={{ margin: 0 }}>
            A day stays green as long as you don't spend from any envelope you mark off-limits. Bills are usually left on, so paying rent doesn't break a streak.
          </p>
          <CardSurface>
            {envelopes.map((envelope, index) => (
              <div key={envelope.id}>
                <div style={{ padding: 'var(--space-tight) 0' }}>
                  <Toggle
                    label={`${envelope.emoji} ${envelope.name}`}
                    isOn={envelope.isOffLimitsForNoSpend}
                    onChange={(isOn) => store.commit(updateEnvelope(store.getSnapshot(), envelope.id, { isOffLimitsForNoSpend: isOn }))}
                  />
                </div>
                {index < envelopes.length - 1 ? <div className="divider" /> : null}
              </div>
            ))}
          </CardSurface>
        </div>
      </div>
    </div>
  )
}
