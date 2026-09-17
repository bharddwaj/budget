/**
 * Swift's `.toNearestOrAwayFromZero`, which every money conversion in the iOS
 * app uses. JavaScript's `Math.round` rounds halves toward +∞ instead, so
 * `Math.round(-0.5)` is `-0` where a person reading a receipt expects `-1`.
 */
export function roundHalfAwayFromZero(value: number): number {
  const sign = value < 0 ? -1 : 1
  return sign * Math.round(Math.abs(value))
}
