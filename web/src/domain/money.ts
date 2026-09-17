import { roundHalfAwayFromZero } from './rounding'

/**
 * A currency amount as whole minor units (cents), never a float.
 *
 * Every balance, allocation and transaction flows through these helpers so
 * repeated stuffing and spending can never accumulate binary rounding error.
 * Division rounds to the nearest cent and `split` distributes the remainder so
 * a divided amount always sums back to the original.
 */
export type Money = number

export const ZERO: Money = 0

/** Builds an amount from a major-unit value, e.g. `fromMajor(12.34)` → 1234. */
export function fromMajor(major: number): Money {
  return roundHalfAwayFromZero(major * 100)
}

/** The amount in major units, for charts and other float-only consumers. */
export function toMajor(money: Money): number {
  return money / 100
}

export function isZero(money: Money): boolean {
  return money === 0
}

export function isNegative(money: Money): boolean {
  return money < 0
}

export function isPositive(money: Money): boolean {
  return money > 0
}

export function magnitude(money: Money): Money {
  return Math.abs(money)
}

export function add(lhs: Money, rhs: Money): Money {
  return lhs + rhs
}

export function subtract(lhs: Money, rhs: Money): Money {
  return lhs - rhs
}

export function negate(money: Money): Money {
  return -money
}

export function multiply(money: Money, factor: number): Money {
  return money * factor
}

/**
 * Divides into `divisor` equal parts, rounding to the nearest cent. Returns
 * zero for a non-positive divisor rather than throwing, because callers derive
 * the divisor from date math that can legitimately yield 0.
 */
export function divide(money: Money, divisor: number): Money {
  if (divisor <= 0) return ZERO
  return roundHalfAwayFromZero(money / divisor)
}

/**
 * Splits into `parts` amounts that sum exactly back to `money`, spreading any
 * leftover cents one-per-part across the leading entries.
 */
export function split(money: Money, parts: number): Money[] {
  if (parts <= 0) return []
  const base = Math.trunc(money / parts)
  let remainder = Math.abs(money % parts)
  const step = money < 0 ? -1 : 1
  const result: Money[] = []
  for (let index = 0; index < parts; index += 1) {
    let value = base
    if (remainder > 0) {
      value += step
      remainder -= 1
    }
    result.push(value)
  }
  return result
}

/** Clamps to zero, used wherever a balance must not be shown as negative. */
export function clampedToZero(money: Money): Money {
  return money < 0 ? ZERO : money
}

export function total(amounts: Iterable<Money>): Money {
  let sum = ZERO
  for (const amount of amounts) sum += amount
  return sum
}
