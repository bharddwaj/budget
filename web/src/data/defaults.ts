import { SETTINGS_ID, type SettingsRecord, type Snapshot } from './types'

export function defaultSettings(): SettingsRecord {
  return {
    id: SETTINGS_ID,
    hasOnboarded: false,
    preferredFrequency: 'biweekly',
    startingCashMinorUnits: 0,
    theme: 'system',
    currencySymbol: '$',
    currencySymbolIsLeading: true,
    currencyDecimals: 2,
    currencyGroupingSeparator: ',',
    currencyDecimalSeparator: '.',
    lockEnabled: false,
    pinHash: null,
    pinSalt: null,
    dailyReminderEnabled: false,
    dailyReminderHour: 20,
    dailyReminderMinute: 0,
    budgetReminderEnabled: true,
    transactionReminderEnabled: false,
    billReminderEnabled: true,
    billReminderLeadDays: 2,
    noSpendTrackingStart: null,
  }
}

export function emptySnapshot(): Snapshot {
  return {
    settings: defaultSettings(),
    envelopes: {},
    transactions: {},
    allocations: {},
    cycles: {},
  }
}
