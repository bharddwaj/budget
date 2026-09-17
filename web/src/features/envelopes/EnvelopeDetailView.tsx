import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { useAppRoute } from '../../app/AppRoute'
import {
  activeCycle,
  envelopeAllocations,
  envelopeTransactions,
  goalProgress,
  isBillOutstanding,
  remainingFraction,
  stuffed,
} from '../../data/store/derive'
import { setRetired } from '../../data/store/ops'
import { formatMoney } from '../../domain/currencyFormat'
import { formatDay, keyFromDate } from '../../domain/dates'
import { clampedToZero } from '../../domain/money'
import { recurrenceTitle } from '../../domain/transactionKind'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { CardSurface } from '../../design/components/CardSurface'
import { EmojiBadge, SectionHeader } from '../../design/components/EmojiBadge'
import { Menu } from '../../design/components/Menu'
import { NavBar, NavIconButton } from '../../design/components/NavBar'
import { PillButton } from '../../design/components/PillButton'
import { ProgressTrack } from '../../design/components/ProgressTrack'
import { Sheet } from '../../design/components/Sheet'
import { TransactionRow } from '../transactions/TransactionRow'
import { MergeEnvelopeSheet } from './MergeEnvelopeSheet'
import './envelopes.css'

/** One envelope: its balance, its purpose, and everything that has moved through it. */
export function EnvelopeDetailView() {
  const { id } = useParams()
  const store = useStore()
  const snapshot = useSnapshot()
  const route = useAppRoute()
  const format = useCurrencyFormat()
  const navigate = useNavigate()
  const [isMerging, setMerging] = useState(false)

  const envelope = id ? snapshot.envelopes[id] : undefined
  const cycle = activeCycle(snapshot)
  const today = store.clock().today

  const history = useMemo(
    () => (envelope ? envelopeAllocations(snapshot, envelope.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 8) : []),
    [snapshot, envelope],
  )
  const ledger = useMemo(
    () =>
      envelope
        ? envelopeTransactions(snapshot, envelope.id)
            .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : b.createdAt - a.createdAt))
            .slice(0, 30)
        : [],
    [snapshot, envelope],
  )

  if (!envelope) {
    return (
      <div className="screen">
        <NavBar leading={<NavIconButton icon="chevron.left" label="Back" onClick={() => navigate(-1)} />} title="Envelope" />
      </div>
    )
  }

  const tint = kindColor(envelope.kind)
  const stuffedThisCycle = stuffed(snapshot, envelope.id, cycle)
  const goal = goalProgress(envelope)
  const outstanding = isBillOutstanding(envelope, today)

  return (
    <div className="screen">
      <NavBar
        leading={<NavIconButton icon="chevron.left" label="Back" onClick={() => navigate(-1)} />}
        title={envelope.name}
        trailing={
          <Menu
            items={[
              { title: 'Edit envelope', icon: 'pencil', onSelect: () => route.editEnvelope(envelope.id) },
              { title: 'Merge into another', icon: 'arrow.triangle.merge', onSelect: () => setMerging(true) },
              envelope.isRetired
                ? { title: 'Unretire', icon: 'arrow.uturn.backward', onSelect: () => store.commit(setRetired(store.getSnapshot(), envelope.id, false)) }
                : { title: 'Retire', icon: 'archivebox', onSelect: () => store.commit(setRetired(store.getSnapshot(), envelope.id, true)) },
            ]}
          />
        }
      />
      <div className="screen__body">
        <div className="screen__content">
          <CardSurface padding={22}>
            <div className="detail-header">
              <EmojiBadge emoji={envelope.emoji} tint={tint} size={64} />
              <span className="detail-header__label">you have</span>
              <AmountText amount={envelope.balanceMinorUnits} font="t-hero" />
              {envelope.kind === 'savings' && goal !== null ? (
                <>
                  <ProgressTrack progress={goal} tint={tint} height={10} />
                  <span className="detail-header__note">{Math.round(goal * 100)}% of the way there</span>
                </>
              ) : stuffedThisCycle > 0 ? (
                <>
                  <ProgressTrack progress={remainingFraction(snapshot, envelope, cycle)} tint={tint} height={10} />
                  <span className="detail-header__note">{formatMoney(format, stuffedThisCycle)} stuffed this budget</span>
                </>
              ) : null}
              {envelope.isRetired ? <span className="t-caption c-warning">Retired</span> : null}
            </div>
          </CardSurface>

          {envelope.kind === 'fixed' ? (
            <CardSurface>
              <DetailRow label="Bill amount" value={formatMoney(format, envelope.billAmountMinorUnits ?? 0)} />
              {envelope.billDueDate ? (
                <>
                  <div className="divider" />
                  <DetailRow label="Next due" value={formatDay(envelope.billDueDate, 'monthDayYear')} />
                </>
              ) : null}
              <div className="divider" />
              <DetailRow label="Repeats" value={recurrenceTitle(envelope.billRecurrence ?? 'monthly')} />
              {outstanding ? (
                <>
                  <div className="divider" />
                  <div className="hint hint--warning" style={{ paddingTop: 'var(--space-small)' }}>
                    <Icon name="exclamationmark.circle.fill" size={18} className="icon" />
                    <span>This bill is due and hasn't been recorded as paid.</span>
                  </div>
                </>
              ) : null}
            </CardSurface>
          ) : null}

          {envelope.kind === 'savings' ? (
            <CardSurface>
              <DetailRow label="Goal" value={formatMoney(format, envelope.goalAmountMinorUnits ?? 0)} />
              <div className="divider" />
              <DetailRow label="Still to save" value={formatMoney(format, clampedToZero((envelope.goalAmountMinorUnits ?? 0) - envelope.balanceMinorUnits))} />
              {envelope.goalDeadline ? (
                <>
                  <div className="divider" />
                  <DetailRow label="By" value={formatDay(envelope.goalDeadline, 'monthDayYear')} />
                </>
              ) : null}
            </CardSurface>
          ) : null}

          <div className="action-row">
            <PillButton title="add" style="secondary" icon="plus" onClick={() => route.addTransaction(envelope.id)} />
            <PillButton title="transfer" style="secondary" icon="arrow.left.arrow.right" onClick={() => route.transfer(envelope.id)} />
          </div>

          {history.length > 0 ? (
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <SectionHeader title="Budget history" />
              <CardSurface>
                {history.map((allocation, index) => (
                  <div key={allocation.id}>
                    <div className="history-row">
                      <div className="vstack" style={{ gap: 2 }}>
                        <span className="history-row__date">{formatDay(keyFromDate(new Date(allocation.createdAt)), 'monthDayYear')}</span>
                        {allocation.suggestedMinorUnits !== 0 ? (
                          <span className="history-row__suggested">suggested {formatMoney(format, allocation.suggestedMinorUnits)}</span>
                        ) : null}
                      </div>
                      <span className="spacer" />
                      <AmountText amount={allocation.amountMinorUnits} font="t-headline" showsSign colorBySign />
                    </div>
                    {index < history.length - 1 ? <div className="divider" /> : null}
                  </div>
                ))}
              </CardSurface>
            </div>
          ) : null}

          {ledger.length > 0 ? (
            <div className="vstack" style={{ gap: 'var(--space-small)' }}>
              <SectionHeader title="Activity" />
              <CardSurface>
                {ledger.map((transaction, index) => (
                  <div key={transaction.id}>
                    <TransactionRow snapshot={snapshot} transaction={transaction} showsEnvelope={false} onClick={() => route.editTransaction(transaction.id)} />
                    {index < ledger.length - 1 ? <div className="divider" /> : null}
                  </div>
                ))}
              </CardSurface>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet isOpen={isMerging} onDismiss={() => setMerging(false)}>
        {isMerging ? (
          <MergeEnvelopeSheet
            sourceID={envelope.id}
            onClose={() => setMerging(false)}
            onMerged={() => {
              setMerging(false)
              navigate('/')
            }}
          />
        ) : null}
      </Sheet>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span className="kv__label">{label}</span>
      <span className="kv__value">{value}</span>
    </div>
  )
}
