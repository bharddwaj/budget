import { addDays, daysBetween, formatDay, type DayKey } from '../../domain/dates'
import { toMajor, type Money } from '../../domain/money'

/** One day's totals for the money-in/money-out chart. */
export interface InOutPoint {
  day: DayKey
  incoming: Money
  outgoing: Money
}

interface InOutChartProps {
  points: InOutPoint[]
  height?: number
}

const LEFT_AXIS = 30
const BOTTOM_AXIS = 20

/**
 * Paired bars per day: income up in green, spending down in red. Zero stays in
 * the middle so a window with only spending still reads as "up is in, down
 * is out".
 */
export function InOutChart({ points, height = 130 }: InOutChartProps) {
  if (points.length === 0) {
    return (
      <div className="inout inout--empty" style={{ height }}>
        <span className="t-caption c-secondary">No activity in this window</span>
      </div>
    )
  }

  const width = 340
  const plotHeight = height - BOTTOM_AXIS
  const plotWidth = width - LEFT_AXIS
  const peak = Math.max(1, ...points.flatMap((p) => [toMajor(p.incoming), toMajor(p.outgoing)]))
  const first = points[0]!.day
  const last = points[points.length - 1]!.day
  const spanDays = daysBetween(first, last)
  const slots = spanDays + 1
  const slotWidth = plotWidth / slots
  const barWidth = Math.max(3, Math.min(18, slotWidth * 0.7))
  const zeroY = plotHeight / 2
  const scale = (value: number) => (value / peak) * (plotHeight / 2 - 4)
  const labelStride = Math.max(1, Math.floor(spanDays / 4))

  const ticks = [peak, peak / 2, 0, peak / 2, peak]
  const labels: DayKey[] = []
  for (let offset = 0; offset <= spanDays; offset += labelStride) labels.push(addDays(first, offset))

  return (
    <div className="inout" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" className="inout__svg">
        {ticks.map((tick, index) => {
          const y = (index / (ticks.length - 1)) * plotHeight
          return (
            <g key={index}>
              <line x1={LEFT_AXIS} x2={width} y1={y} y2={y} stroke="var(--color-separator)" strokeWidth="1" />
              <text x={LEFT_AXIS - 6} y={y + 4} textAnchor="end" className="inout__tick">
                {Math.round(tick)}
              </text>
            </g>
          )
        })}
        {points.map((point) => {
          const x = LEFT_AXIS + daysBetween(first, point.day) * slotWidth + slotWidth / 2 - barWidth / 2
          const up = scale(toMajor(point.incoming))
          const down = scale(toMajor(point.outgoing))
          return (
            <g key={point.day}>
              {point.incoming > 0 ? <rect x={x} y={zeroY - up} width={barWidth} height={up} rx="3" fill="var(--color-positive)" /> : null}
              {point.outgoing > 0 ? <rect x={x} y={zeroY} width={barWidth} height={down} rx="3" fill="var(--color-negative)" /> : null}
            </g>
          )
        })}
        {labels.map((day) => (
          <text key={day} x={LEFT_AXIS + daysBetween(first, day) * slotWidth + slotWidth / 2} y={height - 4} textAnchor="middle" className="inout__tick">
            {formatDay(day, 'monthDay')}
          </text>
        ))}
      </svg>
    </div>
  )
}
