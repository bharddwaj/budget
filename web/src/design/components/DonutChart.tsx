import { useLayoutEffect, useRef, useState } from 'react'
import { formatMoney } from '../../domain/currencyFormat'
import type { Money } from '../../domain/money'
import { useCurrencyFormat } from '../../app/AppEnvironment'
import { AmountText } from './AmountText'

export interface DonutSlice {
  id: string
  label: string
  amount: Money
  color: string
}

interface DonutChartProps {
  slices: DonutSlice[]
  centerTitle: string
  centerAmount: Money
  diameter?: number
}

/** How much of the radius is hole; the ring is the rest. */
const INNER_RADIUS_RATIO = 0.68
const ANGULAR_INSET_DEGREES = 1.5

/** The hero chart: where your money sits, split by envelope type, with the total in the middle. */
export function DonutChart({ slices, centerTitle, centerAmount, diameter = 190 }: DonutChartProps) {
  const format = useCurrencyFormat()
  const positive = slices.filter((slice) => slice.amount > 0)
  const total = positive.reduce((sum, slice) => sum + slice.amount, 0)
  const radius = diameter / 2
  const innerRadius = radius * INNER_RADIUS_RATIO
  const ringWidth = radius - innerRadius
  const strokeRadius = innerRadius + ringWidth / 2
  const circumference = 2 * Math.PI * strokeRadius

  // Keep the label inside the hole: a five-figure total at full size is wider
  // than the ring's inner diameter, so shrink it to fit.
  const holeWidth = innerRadius * 2 * 0.9
  const amountRef = useRef<HTMLSpanElement>(null)
  const [scale, setScale] = useState(1)
  const text = formatMoney(format, centerAmount)
  useLayoutEffect(() => {
    const element = amountRef.current
    if (!element) return
    element.style.transform = 'none'
    const width = element.scrollWidth
    setScale(width > holeWidth ? Math.max(0.5, holeWidth / width) : 1)
  }, [text, holeWidth])

  let offset = 0
  return (
    <div
      className="donut"
      style={{ width: diameter, height: diameter }}
      role="img"
      aria-label={`${centerTitle} ${text}. ${positive.map((s) => `${s.label} ${formatMoney(format, s.amount)}`).join(', ')}`}
    >
      <svg className="donut__svg" width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        {positive.length === 0 ? (
          <circle cx={radius} cy={radius} r={strokeRadius} fill="none" stroke="var(--color-surface-muted)" strokeWidth={ringWidth} />
        ) : (
          positive.map((slice) => {
            const fraction = slice.amount / total
            const insetFraction = positive.length > 1 ? ANGULAR_INSET_DEGREES / 360 : 0
            const visible = Math.max(0, fraction - insetFraction)
            const dash = `${visible * circumference} ${circumference}`
            const rotation = (offset + insetFraction / 2) * 360
            offset += fraction
            return (
              <circle
                key={slice.id}
                cx={radius}
                cy={radius}
                r={strokeRadius}
                fill="none"
                stroke={slice.color}
                strokeWidth={ringWidth}
                strokeDasharray={dash}
                strokeLinecap={positive.length > 1 ? 'round' : 'butt'}
                transform={`rotate(${rotation} ${radius} ${radius})`}
                style={{ transition: 'stroke-dasharray var(--motion-value), transform var(--motion-value)' }}
              />
            )
          })
        )}
      </svg>
      <div className="donut__center" style={{ width: holeWidth }}>
        <span className="donut__title">{centerTitle}</span>
        <span ref={amountRef} className="donut__amount amount" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
          {text}
        </span>
      </div>
    </div>
  )
}

/** The key beneath the donut: a dot, a name and an amount per wedge. */
export function DonutLegend({ slices }: { slices: DonutSlice[] }) {
  return (
    <div className="legend">
      {slices.map((slice) => (
        <div key={slice.id} className="legend__row">
          <span className="legend__dot" style={{ background: slice.color }} />
          <span className="legend__label">{slice.label}</span>
          <span className="spacer" />
          <AmountText amount={slice.amount} font="t-callout" />
        </div>
      ))}
    </div>
  )
}
