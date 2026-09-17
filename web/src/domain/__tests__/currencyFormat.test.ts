import { describe, expect, it } from 'vitest'
import { currencyFormat, digitsOnly, formatMoney, USD } from '../currencyFormat'
import { fromMajor } from '../money'

describe('CurrencyFormat', () => {
  it('formats USD by default', () => {
    expect(formatMoney(USD, fromMajor(0))).toBe('$0.00')
    expect(formatMoney(USD, fromMajor(7.5))).toBe('$7.50')
    expect(formatMoney(USD, fromMajor(1234.56))).toBe('$1,234.56')
    expect(formatMoney(USD, fromMajor(1234567.89))).toBe('$1,234,567.89')
  })

  it('formats negative amounts', () => {
    expect(formatMoney(USD, fromMajor(-12.3))).toBe('-$12.30')
    expect(formatMoney(currencyFormat({ usesMinusSign: false }), fromMajor(-12.3))).toBe('($12.30)')
  })

  it('shows an explicit positive sign on request', () => {
    expect(formatMoney(USD, fromMajor(40), true)).toBe('+$40.00')
    expect(formatMoney(USD, 0, true)).toBe('$0.00')
  })

  it('supports a trailing symbol and European separators', () => {
    const format = currencyFormat({
      symbol: ' €',
      position: 'trailing',
      groupingSeparator: '.',
      decimalSeparator: ',',
    })
    expect(formatMoney(format, fromMajor(1234.5))).toBe('1.234,50 €')
  })

  it('supports zero-decimal currencies', () => {
    const yen = currencyFormat({ symbol: '¥', decimals: 0 })
    expect(formatMoney(yen, fromMajor(1500))).toBe('¥1,500')
  })

  it('digitsOnly omits the symbol', () => {
    expect(digitsOnly(USD, fromMajor(82.05))).toBe('82.05')
  })
})
