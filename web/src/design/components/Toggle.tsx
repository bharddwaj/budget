interface ToggleProps {
  label: string
  isOn: boolean
  onChange: (isOn: boolean) => void
}

/** An iOS-style switch with its label on the left. */
export function Toggle({ label, isOn, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__label">{label}</span>
      <button type="button" role="switch" aria-checked={isOn} className={`switch ${isOn ? 'switch--on' : ''}`} onClick={() => onChange(!isOn)}>
        <span className="switch__knob" />
      </button>
    </label>
  )
}
