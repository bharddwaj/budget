import { useState, type ReactNode } from 'react'
import { useCurrencyFormat, useSnapshot, useStore } from '../../app/AppEnvironment'
import { updateSettings, startFresh } from '../../data/store/ops'
import type { SettingsRecord } from '../../data/types'
import { formatMoney } from '../../domain/currencyFormat'
import { fromMajor } from '../../domain/money'
import { THEME_PREFERENCES, themeTitle, type ThemePreference } from '../../domain/transactionKind'
import { Icon } from '../../design/Icon'
import { CardSurface } from '../../design/components/CardSurface'
import { ConfirmDialog } from '../../design/components/Menu'
import { NavBar, NavTextButton } from '../../design/components/NavBar'
import { Toggle } from '../../design/components/Toggle'
import { requestReminderPermission } from './reminders'
import './settings.css'

interface Props {
  onClose: () => void
}

/** Reminders, appearance, currency, the lock, and the destructive stuff. */
export function SettingsView({ onClose }: Props) {
  const store = useStore()
  const snapshot = useSnapshot()
  const format = useCurrencyFormat()
  const { settings } = snapshot
  const [confirming, setConfirming] = useState<'fresh' | 'delete' | null>(null)

  const patch = (changes: Partial<SettingsRecord>) => store.commit(updateSettings(store.getSnapshot(), changes))

  async function toggleReminder(key: keyof SettingsRecord, isOn: boolean) {
    if (isOn) await requestReminderPermission()
    patch({ [key]: isOn })
  }

  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches

  return (
    <div className="screen">
      <NavBar inSheet title="Settings" trailing={<NavTextButton title="Done" onClick={onClose} />} />
      <div className="screen__body">
        <div className="screen__content screen__content--no-tabs">
          <Group title="Reminders" footer="On the web, reminders can only show while Budget Bestie is open.">
            <Toggle label="Daily check-in" isOn={settings.dailyReminderEnabled} onChange={(on) => toggleReminder('dailyReminderEnabled', on)} />
            {settings.dailyReminderEnabled ? (
              <StepperRow label={`At ${settings.dailyReminderHour}:00`} value={settings.dailyReminderHour} min={6} max={22} onChange={(v) => patch({ dailyReminderHour: v })} />
            ) : null}
            <Toggle label="Second nudge for transactions" isOn={settings.transactionReminderEnabled} onChange={(on) => toggleReminder('transactionReminderEnabled', on)} />
            <Toggle label="Budget day" isOn={settings.budgetReminderEnabled} onChange={(on) => toggleReminder('budgetReminderEnabled', on)} />
            <Toggle label="Bills coming due" isOn={settings.billReminderEnabled} onChange={(on) => toggleReminder('billReminderEnabled', on)} />
            {settings.billReminderEnabled ? (
              <StepperRow label={`${settings.billReminderLeadDays} days ahead`} value={settings.billReminderLeadDays} min={1} max={14} onChange={(v) => patch({ billReminderLeadDays: v })} />
            ) : null}
          </Group>

          <Group title="Appearance">
            <div className="settings-row">
              <span className="settings-row__label">Theme</span>
              <span className="select-wrap">
                <select className="field__select" value={settings.theme} onChange={(event) => patch({ theme: event.target.value as ThemePreference })} aria-label="Theme">
                  {THEME_PREFERENCES.map((option) => (
                    <option key={option} value={option}>
                      {themeTitle(option)}
                    </option>
                  ))}
                </select>
                <Icon name="chevron.up.down" size={14} className="icon" />
              </span>
            </div>
          </Group>

          <Group title="Currency">
            <div className="settings-row">
              <span className="settings-row__label">Symbol</span>
              <input className="symbol-input" placeholder="$" value={settings.currencySymbol} onChange={(event) => patch({ currencySymbol: event.target.value })} />
            </div>
            <Toggle label="Symbol before the amount" isOn={settings.currencySymbolIsLeading} onChange={(on) => patch({ currencySymbolIsLeading: on })} />
            <StepperRow label={`${settings.currencyDecimals} decimal places`} value={settings.currencyDecimals} min={0} max={2} onChange={(v) => patch({ currencyDecimals: v })} />
            <div className="settings-row">
              <span className="settings-row__label">Example</span>
              <span className="settings-row__value tabular">{formatMoney(format, fromMajor(1234.5))}</span>
            </div>
          </Group>

          <Group title="Privacy">
            <div className="settings-row">
              <span className="settings-row__label">Your budget stays on this device</span>
            </div>
          </Group>

          {!isStandalone ? (
            <Group title="Install" footer="Installed apps keep their data reliably and open full screen. In Safari, tap Share, then Add to Home Screen.">
              <div className="settings-row">
                <span className="settings-row__label">Add to Home Screen</span>
              </div>
            </Group>
          ) : null}

          <Group title="Start over">
            <button type="button" className="settings-row settings-row--button" onClick={() => { patch({ hasOnboarded: false }); onClose() }}>
              <span className="settings-row__label">Replay the intro</span>
            </button>
            <div className="divider" />
            <button type="button" className="settings-row settings-row--button settings-row--warning" onClick={() => setConfirming('fresh')}>
              <span className="settings-row__label">Start fresh</span>
            </button>
            <div className="divider" />
            <button type="button" className="settings-row settings-row--button settings-row--destructive" onClick={() => setConfirming('delete')}>
              <span className="settings-row__label">Delete all my data</span>
            </button>
          </Group>

          <Group>
            <div className="settings-row">
              <span className="settings-row__label">Version</span>
              <span className="settings-row__value">1.0 ({__APP_VERSION__})</span>
            </div>
          </Group>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirming === 'fresh'}
        title="Clear your transactions and budgets but keep your envelopes?"
        onCancel={() => setConfirming(null)}
        actions={[{ title: 'Start fresh', destructive: true, onSelect: () => { store.commit(startFresh(store.getSnapshot(), store.clock())); onClose() } }]}
      />
      <ConfirmDialog
        isOpen={confirming === 'delete'}
        title="Delete everything? This can't be undone."
        onCancel={() => setConfirming(null)}
        actions={[
          {
            title: 'Delete everything',
            destructive: true,
            onSelect: async () => {
              await store.wipe()
              try {
                localStorage.clear()
              } catch {
                // ignore
              }
              onClose()
            },
          },
        ]}
      />
    </div>
  )
}

function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children]
  return (
    <div className="settings-group">
      {title ? <span className="settings-group__title">{title}</span> : null}
      <CardSurface>
        {items.map((child, index) => (
          <div key={index}>
            {child}
            {index < items.length - 1 && !isDivider(child) && !isDivider(items[index + 1]) ? <div className="divider" /> : null}
          </div>
        ))}
      </CardSurface>
      {footer ? <span className="settings-group__footer">{footer}</span> : null}
    </div>
  )
}

function isDivider(node: unknown): boolean {
  return typeof node === 'object' && node !== null && 'props' in node && (node as { props: { className?: string } }).props?.className === 'divider'
}

function StepperRow({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="settings-row">
      <span className="settings-row__label">{label}</span>
      <span className="stepper" role="group" aria-label={label}>
        <button type="button" className="stepper__button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="stepper__divider" />
        <button type="button" className="stepper__button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </span>
    </div>
  )
}
