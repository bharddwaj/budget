import type { CSSProperties } from 'react'

interface ProgressTrackProps {
  /** 0…1; values outside are clamped so a blown envelope still draws full. */
  progress: number
  tint: string
  height?: number
}

/** The thin rounded bar under every envelope row and savings goal. */
export function ProgressTrack({ progress, tint, height = 8 }: ProgressTrackProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const style = { '--track-height': `${height}px`, '--track-tint': tint } as CSSProperties
  return (
    <div className="track" style={style} role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="track__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}
