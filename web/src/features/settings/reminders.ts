import { addDays, formatDay, type DayKey } from '../../domain/dates'
import { formatMoney, type CurrencyFormat } from '../../domain/currencyFormat'
import { activeCycle, isBudgetDue, sortedEnvelopes } from '../../data/store/derive'
import type { Snapshot } from '../../data/types'

/**
 * Reminders on the web.
 *
 * A web page cannot schedule a notification for a time it is not running,
 * so these fire while the app is open (or resumed) and dedupe per day. The
 * copy matches the iOS reminders. Background delivery would need Web Push
 * and a server, which this app deliberately does not have.
 */
const FIRED_KEY = 'budget-bestie.reminders.fired'

export async function requestReminderPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return (await Notification.requestPermission()) === 'granted'
}

function firedToday(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { day: string; keys: string[] }
    return new Set(parsed.keys.map((key) => `${parsed.day}|${key}`))
  } catch {
    return new Set()
  }
}

function markFired(day: DayKey, key: string): void {
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    const parsed = raw ? (JSON.parse(raw) as { day: string; keys: string[] }) : { day, keys: [] }
    const keys = parsed.day === day ? parsed.keys : []
    keys.push(key)
    localStorage.setItem(FIRED_KEY, JSON.stringify({ day, keys }))
  } catch {
    // Storage may be unavailable; firing twice is the worst case.
  }
}

function notify(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` })
  } catch {
    // Some browsers only allow notifications from a service worker; ignore.
  }
}

/** Fires whichever reminders are due right now and have not fired today. */
export function fireDueReminders(snapshot: Snapshot, today: DayKey, now: Date, format: CurrencyFormat): void {
  const { settings } = snapshot
  const fired = firedToday()
  const once = (key: string, title: string, body: string) => {
    if (fired.has(`${today}|${key}`)) return
    markFired(today, key)
    notify(title, body)
  }

  if (settings.dailyReminderEnabled && now.getHours() >= settings.dailyReminderHour) {
    once('daily', "How'd today go?", 'Take ten seconds to log what you spent.')
  }
  if (settings.transactionReminderEnabled && now.getHours() >= Math.min(22, settings.dailyReminderHour + 2)) {
    once('transaction', 'Anything left to record?', 'Catching it now keeps your envelopes honest.')
  }
  const cycle = activeCycle(snapshot)
  if (settings.budgetReminderEnabled && cycle && isBudgetDue(cycle, today)) {
    once('budget', "It's budget day ✨", 'Time to stuff your envelopes for the next stretch.')
  }
  if (settings.billReminderEnabled) {
    const horizon = addDays(today, settings.billReminderLeadDays)
    for (const envelope of sortedEnvelopes(snapshot)) {
      if (envelope.kind !== 'fixed' || envelope.billDueDate === null) continue
      if (envelope.billDueDate < today || envelope.billDueDate > horizon) continue
      once(
        `bill.${envelope.id}`,
        `${envelope.emoji} ${envelope.name} is due soon`,
        `${formatMoney(format, envelope.billAmountMinorUnits ?? 0)} due ${formatDay(envelope.billDueDate, 'monthDay')}.`,
      )
    }
  }
}
