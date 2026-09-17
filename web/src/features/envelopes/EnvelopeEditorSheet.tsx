import { useState, type CSSProperties } from 'react'
import { useSnapshot, useStore } from '../../app/AppEnvironment'
import { changeKind, createEnvelope, deleteEnvelope, setRetired, updateEnvelope } from '../../data/store/ops'
import type { BillRecurrence, Id } from '../../data/types'
import { mergeChangeSets } from '../../data/changeSet'
import { applyChangeSet } from '../../data/changeSet'
import { formatDay, todayKey, type DayKey } from '../../domain/dates'
import { ENVELOPE_KIND_ORDER, isSpendFreeByDefault, kindBlurb, kindTitle, type EnvelopeKind } from '../../domain/envelopeKind'
import type { Money } from '../../domain/money'
import { BILL_RECURRENCES, recurrenceTitle } from '../../domain/transactionKind'
import { Icon } from '../../design/Icon'
import { kindColor, kindIcon } from '../../design/kinds'
import { AmountEntrySheet } from '../../design/components/AmountEntrySheet'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge, SectionHeader } from '../../design/components/EmojiBadge'
import { EmojiPicker } from '../../design/components/EmojiPicker'
import { DatePicker } from '../../design/components/MonthCalendarGrid'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'
import { Toggle } from '../../design/components/Toggle'
import { ConfirmDialog } from '../../design/components/Menu'

interface Props {
  editingID: Id | null
  onClose: () => void
  /** Called after a retire/delete so the detail screen can pop. */
  onRemoved?: () => void
}

/** Create or edit an envelope: emoji, name, stuffing method and its details. */
export function EnvelopeEditorSheet({ editingID, onClose, onRemoved }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const editing = editingID ? snapshot.envelopes[editingID] ?? null : null

  const [emoji, setEmoji] = useState(editing?.emoji ?? '🛒')
  const [name, setName] = useState(editing?.name ?? '')
  const [kind, setKind] = useState<EnvelopeKind>(editing?.kind ?? 'variable')
  const [billAmount, setBillAmount] = useState<Money>(editing?.billAmountMinorUnits ?? 0)
  const [billDueDate, setBillDueDate] = useState<DayKey>(editing?.billDueDate ?? todayKey())
  const [billRecurrence, setBillRecurrence] = useState<BillRecurrence>(editing?.billRecurrence ?? 'monthly')
  const [goalAmount, setGoalAmount] = useState<Money>(editing?.goalAmountMinorUnits ?? 0)
  const [hasDeadline, setHasDeadline] = useState(editing?.goalDeadline !== null && editing?.goalDeadline !== undefined)
  const [goalDeadline, setGoalDeadline] = useState<DayKey>(editing?.goalDeadline ?? todayKey())
  const [isOffLimits, setOffLimits] = useState(editing?.isOffLimitsForNoSpend ?? true)
  const [editingAmount, setEditingAmount] = useState<'bill' | 'goal' | null>(null)
  const [pickingDate, setPickingDate] = useState<'due' | 'deadline' | null>(null)
  const [isConfirmingDelete, setConfirmingDelete] = useState(false)

  // Picking a type flips the no-spend default the way the model's init does,
  // unless the user has already made a choice while editing.
  function pickKind(candidate: EnvelopeKind) {
    setKind(candidate)
    if (!editing) setOffLimits(!isSpendFreeByDefault(candidate))
  }

  const isValid = name.trim() !== '' && (kind === 'variable' || (kind === 'fixed' ? billAmount > 0 : goalAmount > 0))

  function save() {
    const details = {
      emoji,
      name: name.trim(),
      isOffLimitsForNoSpend: isOffLimits,
      billAmountMinorUnits: kind === 'fixed' ? billAmount : null,
      billDueDate: kind === 'fixed' ? billDueDate : null,
      billRecurrence: kind === 'fixed' ? billRecurrence : null,
      goalAmountMinorUnits: kind === 'savings' ? goalAmount : null,
      goalDeadline: kind === 'savings' && hasDeadline ? goalDeadline : null,
    }
    const current = store.getSnapshot()
    if (editing) {
      const kindChange = changeKind(current, editing.id, kind)
      const afterKind = applyChangeSet(current, kindChange)
      store.commit(mergeChangeSets(kindChange, updateEnvelope(afterKind, editing.id, details)))
    } else {
      store.commit(createEnvelope(current, emoji, name.trim(), kind, store.clock(), details).changes)
    }
    onClose()
  }

  return (
    <div className="screen">
      <NavBar inSheet title={editing ? 'Edit envelope' : 'New envelope'} leading={<NavTextButton title="Cancel" quiet onClick={onClose} />} />
      <div className="screen__body" style={{ position: 'relative' }}>
        <div className="screen__content screen__content--pinned">
          <CardSurface>
            <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
              <div className="identity">
                <EmojiBadge emoji={emoji} tint={kindColor(kind)} size={56} />
                <input className="text-field" placeholder="Name it" value={name} onChange={(event) => setName(event.target.value)} autoCapitalize="words" />
              </div>
              <div className="divider" />
              <EmojiPicker selection={emoji} onSelect={setEmoji} />
            </div>
          </CardSurface>

          <CardSurface>
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <SectionHeader title="Stuffing method" />
              {ENVELOPE_KIND_ORDER.map((candidate, index) => (
                <div key={candidate}>
                  <button type="button" className="method-row" onClick={() => pickKind(candidate)}>
                    <span className="method-row__icon" style={{ color: kindColor(candidate) }}>
                      <Icon name={kindIcon(candidate)} size={22} />
                    </span>
                    <span className="method-row__body">
                      <span className="method-row__title">{kindTitle(candidate)}</span>
                      <span className="method-row__blurb">{kindBlurb(candidate)}</span>
                    </span>
                    <span
                      className="method-row__check"
                      style={{ color: kind === candidate ? kindColor(candidate) : 'var(--color-separator)', '--icon-check-color': 'var(--color-surface)' } as CSSProperties}
                    >
                      <Icon name={kind === candidate ? 'checkmark.circle.fill' : 'circle'} size={22} />
                    </span>
                  </button>
                  {index < ENVELOPE_KIND_ORDER.length - 1 ? <div className="divider" /> : null}
                </div>
              ))}
            </div>
          </CardSurface>

          {kind === 'variable' ? (
            <CardSurface background="var(--color-surface-muted)">
              <div className="hint">
                <Icon name="sparkles" size={18} className="icon" />
                <span>We'll suggest an amount once you've spent here a few times, based on your last 3 months.</span>
              </div>
            </CardSurface>
          ) : null}

          {kind === 'fixed' ? (
            <CardSurface>
              <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
                <AmountRow label="Bill amount" amount={billAmount} onClick={() => setEditingAmount('bill')} />
                <div className="divider" />
                <div className="field" style={{ padding: 0 }}>
                  <span className="t-callout c-primary">Next due</span>
                  <button type="button" className="field__value" onClick={() => setPickingDate((open) => (open === 'due' ? null : 'due'))}>
                    {formatDay(billDueDate, 'monthDayYear')}
                  </button>
                </div>
                {pickingDate === 'due' ? (
                  <DatePicker
                    value={billDueDate}
                    onChange={(day) => {
                      setBillDueDate(day)
                      setPickingDate(null)
                    }}
                  />
                ) : null}
                <div className="divider" />
                <div className="field field--center" style={{ padding: 0 }}>
                  <span className="select-wrap">
                    <select className="field__select" value={billRecurrence} onChange={(event) => setBillRecurrence(event.target.value as BillRecurrence)} aria-label="Repeats">
                      {BILL_RECURRENCES.map((rule) => (
                        <option key={rule} value={rule}>
                          {recurrenceTitle(rule)}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron.up.down" size={14} className="icon" />
                  </span>
                </div>
              </div>
            </CardSurface>
          ) : null}

          {kind === 'savings' ? (
            <CardSurface>
              <div className="vstack" style={{ gap: 'var(--space-medium)' }}>
                <AmountRow label="Goal amount" amount={goalAmount} onClick={() => setEditingAmount('goal')} />
                <div className="divider" />
                <Toggle label="Set a deadline" isOn={hasDeadline} onChange={setHasDeadline} />
                {hasDeadline ? (
                  <>
                    <div className="field" style={{ padding: 0 }}>
                      <span className="t-callout c-primary">By</span>
                      <button type="button" className="field__value" onClick={() => setPickingDate((open) => (open === 'deadline' ? null : 'deadline'))}>
                        {formatDay(goalDeadline, 'monthDayYear')}
                      </button>
                    </div>
                    {pickingDate === 'deadline' ? (
                      <DatePicker
                        value={goalDeadline}
                        onChange={(day) => {
                          setGoalDeadline(day)
                          setPickingDate(null)
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </CardSurface>
          ) : null}

          <CardSurface>
            <div className="vstack" style={{ gap: 'var(--space-tight)' }}>
              <Toggle label="Spending here breaks a spend-free day" isOn={isOffLimits} onChange={setOffLimits} />
              <span className="t-caption c-secondary">Bills are usually left on, so paying rent doesn't ruin a streak.</span>
            </div>
          </CardSurface>

          {editing ? (
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <PillButton
                title={editing.isRetired ? 'unretire envelope' : 'retire envelope'}
                style="secondary"
                onClick={() => {
                  store.commit(setRetired(store.getSnapshot(), editing.id, !editing.isRetired))
                  onClose()
                }}
              />
              <PillButton title="delete envelope" style="destructive" onClick={() => setConfirmingDelete(true)} />
              <span className="t-caption c-secondary" style={{ textAlign: 'center' }}>
                Retiring keeps your history; deleting removes it for good.
              </span>
            </div>
          ) : null}
        </div>
        <div className="pinned-actions pinned-actions--overlay">
          <PillButton title="save" isEnabled={isValid} onClick={save} />
        </div>
      </div>

      <AmountEntrySheet
        isOpen={editingAmount === 'bill'}
        title="How much is the bill?"
        caption="An estimate is fine — you can change it later."
        amount={billAmount}
        onDone={(amount) => {
          setBillAmount(amount)
          setEditingAmount(null)
        }}
        onCancel={() => setEditingAmount(null)}
      />
      <AmountEntrySheet
        isOpen={editingAmount === 'goal'}
        title="What's your goal?"
        amount={goalAmount}
        onDone={(amount) => {
          setGoalAmount(amount)
          setEditingAmount(null)
        }}
        onCancel={() => setEditingAmount(null)}
      />
      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="Delete this envelope and everything recorded against it?"
        onCancel={() => setConfirmingDelete(false)}
        actions={[
          {
            title: 'Delete envelope',
            destructive: true,
            onSelect: () => {
              if (editing) store.commit(deleteEnvelope(store.getSnapshot(), editing.id))
              onClose()
              onRemoved?.()
            },
          },
        ]}
      />
    </div>
  )
}

function AmountRow({ label, amount, onClick }: { label: string; amount: Money; onClick: () => void }) {
  return (
    <button type="button" className="amount-row" onClick={onClick}>
      <span className="amount-row__label">{label}</span>
      <AmountText amount={amount} font="t-headline" />
      <span className="amount-row__chevron">
        <Icon name="chevron.right" size={12} strokeWidth={3} />
      </span>
    </button>
  )
}
