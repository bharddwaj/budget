import { useState, type CSSProperties } from 'react'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { sortedEnvelopes } from '../../data/store/derive'
import { transfer } from '../../data/store/ops'
import type { EnvelopeRecord, Id } from '../../data/types'
import { formatMoney } from '../../domain/currencyFormat'
import { formatDay, todayKey, type DayKey } from '../../domain/dates'
import { commit, keypadState, press } from '../../domain/keypadEngine'
import { kindColor } from '../../design/kinds'
import { BudgetKeypad, KeypadDisplay } from '../../design/components/BudgetKeypad'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { DatePicker } from '../../design/components/MonthCalendarGrid'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'

interface Props {
  sourceID: Id | null
  onClose: () => void
}

/** Moves money from one envelope to another. */
export function TransferSheet({ sourceID, onClose }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  const envelopes = sortedEnvelopes(snapshot)
  const [keypad, setKeypad] = useState(() => keypadState(0))
  const [source, setSource] = useState<Id | null>(sourceID)
  const [destination, setDestination] = useState<Id | null>(null)
  const [date, setDate] = useState<DayKey>(todayKey())
  const [isPickingDate, setPickingDate] = useState(false)

  const sourceEnvelope = source ? snapshot.envelopes[source] : undefined
  const isValid = source !== null && destination !== null && source !== destination && keypad.value > 0
  // Warns rather than blocks: pulling an envelope negative is allowed, since
  // real life sometimes gets there before the next budget does.
  const overdrawWarning =
    sourceEnvelope && keypad.value > sourceEnvelope.balanceMinorUnits
      ? `${sourceEnvelope.name} only has ${formatMoney(format, sourceEnvelope.balanceMinorUnits)} — this will take it negative.`
      : null

  return (
    <div className="screen">
      <NavBar inSheet title="Move money" leading={<NavTextButton title="Cancel" quiet onClick={onClose} />} />
      <div className="screen__body" style={{ position: 'relative' }}>
        <div className="screen__content screen__content--pinned">
          <KeypadDisplay state={keypad} caption={overdrawWarning} />
          <BudgetKeypad onPress={(key) => setKeypad((prev) => press(prev, key))} suggested={null} showsEmpty={false} />
          <Picker title="From" envelopes={envelopes} selection={source} exclude={destination} onSelect={setSource} />
          <Picker title="To" envelopes={envelopes} selection={destination} exclude={source} onSelect={setDestination} />
          <CardSurface>
            <div className="field" style={{ padding: 0 }}>
              <span className="t-callout c-primary">When</span>
              <button type="button" className="field__value" onClick={() => setPickingDate((open) => !open)}>
                {formatDay(date, 'monthDayYear')}
              </button>
            </div>
            {isPickingDate ? (
              <div style={{ paddingTop: 'var(--space-small)' }}>
                <DatePicker
                  value={date}
                  onChange={(day) => {
                    setDate(day)
                    setPickingDate(false)
                  }}
                />
              </div>
            ) : null}
          </CardSurface>
        </div>
        <div className="pinned-actions pinned-actions--overlay">
          <PillButton
            title="transfer"
            isEnabled={isValid}
            onClick={() => {
              if (!source || !destination) return
              store.commit(transfer(store.getSnapshot(), commit(keypad).value, source, destination, date, store.clock()))
              onClose()
            }}
          />
        </div>
      </div>
    </div>
  )
}

function Picker({
  title,
  envelopes,
  selection,
  exclude,
  onSelect,
}: {
  title: string
  envelopes: EnvelopeRecord[]
  selection: Id | null
  exclude: Id | null
  onSelect: (id: Id) => void
}) {
  return (
    <div className="vstack" style={{ gap: 'var(--space-small)' }}>
      <SectionHeader title={title} />
      <div className="tile-picker">
        {envelopes
          .filter((envelope) => envelope.id !== exclude)
          .map((envelope) => {
            const isSelected = selection === envelope.id
            return (
              <button
                key={envelope.id}
                type="button"
                className={`tile-pick ${isSelected ? 'tile-pick--selected' : ''}`}
                style={isSelected ? ({ background: kindColor(envelope.kind) } as CSSProperties) : undefined}
                onClick={() => onSelect(envelope.id)}
                aria-pressed={isSelected}
              >
                <span className="emoji">{envelope.emoji}</span>
                <span className="tile-pick__name">{envelope.name}</span>
              </button>
            )
          })}
      </div>
    </div>
  )
}
