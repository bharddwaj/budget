import { describe, expect, it } from 'vitest'
import { clampedToZero, divide, fromMajor, multiply, split, subtract, total, add } from '../money'

describe('Money', () => {
  it('rounds half away from zero when built from major units', () => {
    expect(fromMajor(12.34)).toBe(1234)
    expect(fromMajor(0.005)).toBe(1)
    expect(fromMajor(-0.005)).toBe(-1)
  })

  it('does arithmetic', () => {
    expect(add(fromMajor(10), fromMajor(2.5))).toBe(fromMajor(12.5))
    expect(subtract(fromMajor(10), fromMajor(12.5))).toBe(fromMajor(-2.5))
    expect(multiply(fromMajor(10), 3)).toBe(fromMajor(30))
  })

  it('division rounds to the nearest cent and tolerates zero', () => {
    expect(divide(1000, 3)).toBe(333)
    expect(divide(1001, 2)).toBe(501)
    expect(divide(1000, 0)).toBe(0)
    expect(divide(1000, -4)).toBe(0)
  })

  it('split always sums back to the original', () => {
    for (let parts = 1; parts <= 9; parts += 1) {
      const pieces = split(1000, parts)
      expect(pieces).toHaveLength(parts)
      expect(total(pieces)).toBe(1000)
    }
  })

  it('split of a negative amount sums back', () => {
    expect(total(split(-1000, 3))).toBe(-1000)
  })

  it('clamps to zero', () => {
    expect(clampedToZero(fromMajor(-5))).toBe(0)
    expect(clampedToZero(fromMajor(5))).toBe(fromMajor(5))
  })
})
