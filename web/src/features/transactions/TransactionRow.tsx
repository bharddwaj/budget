import { isRecurring, transactionDisplayTitle, transactionSignedAmount } from '../../data/store/derive'
import type { Snapshot, TransactionRecord } from '../../data/types'
import { transactionKindTitle } from '../../domain/transactionKind'
import { Icon } from '../../design/Icon'
import { kindColor } from '../../design/kinds'
import { AmountText } from '../../design/components/AmountText'
import { EmojiBadge } from '../../design/components/EmojiBadge'

interface Props {
  snapshot: Snapshot
  transaction: TransactionRecord
  /** Hide the envelope name on an envelope's own detail screen. */
  showsEnvelope?: boolean
  onClick?: () => void
  onLongPress?: () => void
}

/** One line in the ledger. */
export function TransactionRow({ snapshot, transaction, showsEnvelope = true, onClick, onLongPress }: Props) {
  const envelope = snapshot.envelopes[transaction.envelopeID]
  let timer: number | undefined
  const start = () => {
    if (!onLongPress) return
    timer = window.setTimeout(onLongPress, 500)
  }
  const cancel = () => {
    if (timer) window.clearTimeout(timer)
  }
  return (
    <button
      type="button"
      className="row row--tappable"
      style={{ padding: 'var(--space-small) 0' }}
      onClick={onClick}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        if (onLongPress) {
          event.preventDefault()
          onLongPress()
        }
      }}
    >
      <EmojiBadge emoji={envelope?.emoji ?? '💸'} tint={envelope ? kindColor(envelope.kind) : 'var(--color-accent)'} size={38} />
      <div className="row__body">
        <span className="row__title">{transactionDisplayTitle(snapshot, transaction)}</span>
        <span className="row__subtitle hstack" style={{ gap: 6 }}>
          {showsEnvelope && envelope ? <span>{envelope.name}</span> : null}
          {transaction.kind !== 'expense' ? <span>{transactionKindTitle(transaction.kind)}</span> : null}
          {isRecurring(transaction) ? <Icon name="repeat" size={12} /> : null}
        </span>
      </div>
      <AmountText amount={transactionSignedAmount(transaction)} font="t-headline" showsSign colorBySign />
    </button>
  )
}
