import { useCurrencyFormat } from '../../app/AppEnvironment'
import { goalProgress, isBillOutstanding, remainingFraction, stuffed } from '../../data/store/derive'
import type { BudgetCycleRecord, EnvelopeRecord, Snapshot } from '../../data/types'
import { formatMoney } from '../../domain/currencyFormat'
import { formatDay, type DayKey } from '../../domain/dates'
import { clampedToZero } from '../../domain/money'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { EmojiBadge } from '../../design/components/EmojiBadge'
import { ProgressTrack } from '../../design/components/ProgressTrack'

interface Props {
  snapshot: Snapshot
  envelope: EnvelopeRecord
  cycle: BudgetCycleRecord | null
  today: DayKey
  onClick: () => void
}

/**
 * One envelope in the home list: emoji, name, what's left, and a bar showing
 * how much of this budget's stuffing is still in the envelope.
 */
export function EnvelopeRow({ snapshot, envelope, cycle, today, onClick }: Props) {
  const format = useCurrencyFormat()
  const tint = kindColor(envelope.kind)
  const progress = envelope.kind === 'savings' ? (goalProgress(envelope) ?? 0) : remainingFraction(snapshot, envelope, cycle)
  const outstanding = envelope.kind === 'fixed' && isBillOutstanding(envelope, today)

  let subtitle: string | null = null
  switch (envelope.kind) {
    case 'variable': {
      const stuffedAmount = stuffed(snapshot, envelope.id, cycle)
      if (stuffedAmount > 0) {
        const spent = clampedToZero(stuffedAmount - envelope.balanceMinorUnits)
        subtitle = `${formatMoney(format, spent)} of ${formatMoney(format, stuffedAmount)} spent`
      }
      break
    }
    case 'fixed': {
      if (envelope.billDueDate !== null) {
        const due = formatDay(envelope.billDueDate, 'monthDay')
        subtitle = outstanding ? `Due ${due} — not paid yet` : `Due ${due}`
      }
      break
    }
    case 'savings': {
      const goal = envelope.goalAmountMinorUnits
      if (goal !== null && goal > 0) {
        const left = clampedToZero(goal - envelope.balanceMinorUnits)
        subtitle = left === 0 ? 'Goal reached 🎉' : `${formatMoney(format, left)} to go`
      }
      break
    }
  }

  return (
    <button type="button" className="row row--tappable" style={{ padding: 'var(--space-small) 0' }} onClick={onClick}>
      <EmojiBadge emoji={envelope.emoji} tint={tint} />
      <div className="row__body" style={{ gap: 'var(--space-tight)' }}>
        <div className="hstack" style={{ gap: 'var(--space-small)' }}>
          <span className="row__title">{envelope.name}</span>
          <span className="spacer" />
          <AmountText amount={envelope.balanceMinorUnits} font="t-headline" color={envelope.balanceMinorUnits < 0 ? 'var(--color-negative)' : undefined} />
        </div>
        <ProgressTrack progress={progress} tint={tint} />
        {subtitle ? (
          <span className="row__subtitle" style={{ color: outstanding ? 'var(--color-warning)' : undefined }}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </button>
  )
}
