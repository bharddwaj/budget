import type { CSSProperties } from 'react'
import { formatMoney } from '../../domain/currencyFormat'
import type { Money } from '../../domain/money'
import { useCurrencyFormat } from '../../app/AppEnvironment'

interface AmountTextProps {
  amount: Money
  /** A typography class such as `t-headline`; defaults to body. */
  font?: string
  /** Show `+` in front of positive amounts, for transaction lists. */
  showsSign?: boolean
  /** Colour by sign instead of using the primary text colour. */
  colorBySign?: boolean
  color?: string
  className?: string
  style?: CSSProperties
}

/** Renders a `Money` using the user's currency settings. */
export function AmountText({
  amount,
  font = 't-body',
  showsSign = false,
  colorBySign = false,
  color,
  className,
  style,
}: AmountTextProps) {
  const format = useCurrencyFormat()
  return (
    <span className={`amount ${font} ${className ?? ''}`} style={{ color: resolvedColor(amount, colorBySign, color), ...style }}>
      {formatMoney(format, amount, showsSign)}
    </span>
  )
}

function resolvedColor(amount: Money, colorBySign: boolean, color?: string): string {
  if (color) return color
  if (!colorBySign) return 'var(--color-text-primary)'
  if (amount < 0) return 'var(--color-negative)'
  if (amount > 0) return 'var(--color-positive)'
  return 'var(--color-text-secondary)'
}
