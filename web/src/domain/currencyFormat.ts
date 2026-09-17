import type { Money } from './money'

/**
 * How amounts are rendered throughout the app.
 *
 * The user owns the symbol, its position and the separators, so formatting is
 * a value rather than a locale lookup. Digits are assembled by hand instead of
 * through `Intl.NumberFormat` so the output is identical everywhere.
 */
export type SymbolPosition = 'leading' | 'trailing'

export interface CurrencyFormat {
  symbol: string
  position: SymbolPosition
  /** 2 for dollars-and-cents, 0 for whole-unit currencies such as yen. */
  decimals: number
  groupingSeparator: string
  decimalSeparator: string
  /** When true a negative amount reads `-$12.34`; when false, `($12.34)`. */
  usesMinusSign: boolean
}

export const USD: CurrencyFormat = {
  symbol: '$',
  position: 'leading',
  decimals: 2,
  groupingSeparator: ',',
  decimalSeparator: '.',
  usesMinusSign: true,
}

export function currencyFormat(overrides: Partial<CurrencyFormat> = {}): CurrencyFormat {
  return { ...USD, ...overrides }
}

/**
 * `$1,234.56`. Set `showsSign` to force a leading `+` on positive amounts,
 * which the transactions list uses to distinguish income from expenses.
 */
export function formatMoney(format: CurrencyFormat, money: Money, showsSign = false): string {
  const negative = money < 0
  const digits = absoluteDigits(format, money)
  const body = format.position === 'leading' ? format.symbol + digits : digits + format.symbol

  if (negative) {
    return format.usesMinusSign ? '-' + body : '(' + body + ')'
  }
  return showsSign && money > 0 ? '+' + body : body
}

/** The amount without its symbol, for displays that render the symbol separately. */
export function digitsOnly(format: CurrencyFormat, money: Money): string {
  return (money < 0 ? '-' : '') + absoluteDigits(format, money)
}

function absoluteDigits(format: CurrencyFormat, money: Money): string {
  const scale = 10 ** format.decimals
  const absolute = Math.abs(money)
  // Money is always stored in hundredths; rescale when the currency shows a
  // different number of decimal places.
  const rescaled = format.decimals === 2 ? absolute : Math.round((absolute / 100) * scale)
  const whole = format.decimals === 0 ? rescaled : Math.floor(rescaled / scale)
  const fraction = format.decimals === 0 ? 0 : rescaled % scale

  let result = grouped(format, String(whole))
  if (format.decimals > 0) {
    result += format.decimalSeparator + String(fraction).padStart(format.decimals, '0')
  }
  return result
}

function grouped(format: CurrencyFormat, digits: string): string {
  if (digits.length <= 3 || format.groupingSeparator === '') return digits
  const groups: string[] = []
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end))
  }
  return groups.join(format.groupingSeparator)
}
