import { useState, type CSSProperties } from 'react'
import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { sortedEnvelopes } from '../../data/store/derive'
import { deleteTransaction, record, updateTransaction } from '../../data/store/ops'
import type { Id } from '../../data/types'
import { formatDay, todayKey, type DayKey } from '../../domain/dates'
import { commit, keypadState, press } from '../../domain/keypadEngine'
import { RECURRENCE_RULES, recurrenceTitle, type RecurrenceRule, type TransactionKind } from '../../domain/transactionKind'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { BudgetKeypad, KeypadDisplay } from '../../design/components/BudgetKeypad'
import { CardSurface } from '../../design/components/CardSurface'
import { SectionHeader } from '../../design/components/EmojiBadge'
import { DatePicker } from '../../design/components/MonthCalendarGrid'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'

interface Props {
  editingID: Id | null
  /** Pre-selects an envelope when adding from its detail screen. */
  envelopeID: Id | null
  onClose: () => void
}

/**
 * The `+` sheet: amount, expense or income, an optional description, a date
 * and an envelope. Doubles as the edit screen when handed an existing row.
 */
export function TransactionEditorSheet({ editingID, envelopeID, onClose }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const editing = editingID ? snapshot.transactions[editingID] ?? null : null
  const envelopes = sortedEnvelopes(snapshot)

  const [keypad, setKeypad] = useState(() => keypadState(editing?.amountMinorUnits ?? 0))
  const [kind, setKind] = useState<TransactionKind>(editing?.kind === 'income' ? 'income' : 'expense')
  const [note, setNote] = useState(editing?.note ?? '')
  const [date, setDate] = useState<DayKey>(editing?.date ?? todayKey())
  const [selectedEnvelope, setSelectedEnvelope] = useState<Id | null>(
    editing?.envelopeID ?? envelopeID ?? envelopes[0]?.id ?? null,
  )
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(editing?.recurrence ?? 'none')
  const [isPickingDate, setPickingDate] = useState(false)

  const isValid = selectedEnvelope !== null && keypad.value > 0

  function submit() {
    if (!selectedEnvelope) return
    const amount = commit(keypad).value
    if (editing) {
      store.commit(updateTransaction(store.getSnapshot(), editing.id, { amount, kind, note, date, envelopeID: selectedEnvelope, recurrence }))
    } else {
      store.commit(record(store.getSnapshot(), { amount, kind, note, date, envelopeID: selectedEnvelope, recurrence }, store.clock()).changes)
    }
    onClose()
  }

  function remove() {
    if (editing) store.commit(deleteTransaction(store.getSnapshot(), editing.id))
    onClose()
  }

  return (
    <div className="screen">
      <NavBar
        inSheet
        title={editing ? 'Edit transaction' : 'New transaction'}
        leading={<NavTextButton title="Cancel" quiet onClick={onClose} />}
        trailing={
          editing ? (
            <button type="button" className="navbar__text-button" style={{ color: 'var(--color-negative)' }} aria-label="Delete" onClick={remove}>
              <Icon name="trash" size={20} />
            </button>
          ) : null
        }
      />
      <div className="screen__body" style={{ position: 'relative' }}>
        <div className="screen__content screen__content--pinned">
          <KeypadDisplay state={keypad} />

          <div className="segments">
            <button type="button" className={`segment segment--expense ${kind === 'expense' ? 'segment--selected' : ''}`} onClick={() => setKind('expense')}>
              <Icon name="arrow.up.right" size={16} strokeWidth={2.4} />
              Expense
            </button>
            <button type="button" className={`segment segment--income ${kind === 'income' ? 'segment--selected' : ''}`} onClick={() => setKind('income')}>
              <Icon name="arrow.down.left" size={16} strokeWidth={2.4} />
              Income
            </button>
          </div>

          <BudgetKeypad onPress={(key) => setKeypad((prev) => press(prev, key))} suggested={null} showsEmpty={false} />

          <CardSurface>
            <div className="field">
              <span className="field__label">Description</span>
              <input className="field__input" placeholder="optional" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <div className="divider" />
            <div className="field">
              <span className="field__label">When</span>
              <button type="button" className="field__value" onClick={() => setPickingDate((open) => !open)}>
                {formatDay(date, 'monthDayYear')}
              </button>
            </div>
            {isPickingDate ? (
              <div style={{ padding: 'var(--space-small) 0' }}>
                <DatePicker
                  value={date}
                  onChange={(day) => {
                    setDate(day)
                    setPickingDate(false)
                  }}
                />
              </div>
            ) : null}
            <div className="divider" />
            <div className="field field--center">
              <span className="select-wrap">
                <select className="field__select" value={recurrence} onChange={(event) => setRecurrence(event.target.value as RecurrenceRule)} aria-label="Repeats">
                  {RECURRENCE_RULES.map((rule) => (
                    <option key={rule} value={rule}>
                      {recurrenceTitle(rule)}
                    </option>
                  ))}
                </select>
                <Icon name="chevron.up.down" size={14} className="icon" />
              </span>
            </div>
          </CardSurface>

          <div className="vstack" style={{ gap: 'var(--space-small)' }}>
            <SectionHeader title="Which envelope?" />
            {envelopes.length === 0 ? (
              <span className="t-caption c-secondary">Create an envelope first — every transaction belongs to one.</span>
            ) : (
              <div className="picker-grid">
                {envelopes.map((envelope) => {
                  const isSelected = selectedEnvelope === envelope.id
                  return (
                    <button
                      key={envelope.id}
                      type="button"
                      className={`picker-chip ${isSelected ? 'picker-chip--selected' : ''}`}
                      style={isSelected ? ({ background: kindColor(envelope.kind) } as CSSProperties) : undefined}
                      onClick={() => setSelectedEnvelope(envelope.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="emoji">{envelope.emoji}</span>
                      <span className="picker-chip__name">{envelope.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="pinned-actions pinned-actions--overlay">
          <PillButton title={editing ? 'Save changes' : 'Add Transaction'} isEnabled={isValid} onClick={submit} />
        </div>
      </div>
    </div>
  )
}
