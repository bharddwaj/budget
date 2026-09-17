import { SectionHeader } from './EmojiBadge'

/** The curated emoji sets offered when naming an envelope. */
export const EMOJI_GROUPS: readonly { title: string; emoji: readonly string[] }[] = [
  { title: 'Everyday', emoji: ['🛒', '🍜', '☕️', '⛽️', '🚌', '🧻', '🐶', '💊'] },
  { title: 'Home & bills', emoji: ['🏠', '💡', '📱', '🛜', '🚗', '🛡️', '🧾', '🏦'] },
  { title: 'Fun', emoji: ['🎀', '💅', '🎬', '🎧', '📚', '🍸', '🎮', '💐'] },
  { title: 'Goals', emoji: ['🛟', '✈️', '🎄', '💍', '🏝️', '🎓', '🚙', '🐖'] },
]

interface EmojiPickerProps {
  selection: string
  onSelect: (emoji: string) => void
}

export function EmojiPicker({ selection, onSelect }: EmojiPickerProps) {
  return (
    <div className="vstack" style={{ gap: 'var(--space-small)' }}>
      {EMOJI_GROUPS.map((group) => (
        <div key={group.title} className="vstack" style={{ gap: 'var(--space-tight)' }}>
          <SectionHeader title={group.title} />
          <div className="emoji-grid">
            {group.emoji.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-cell ${selection === emoji ? 'emoji-cell--selected' : ''}`}
                onClick={() => onSelect(emoji)}
                aria-label={emoji}
                aria-pressed={selection === emoji}
              >
                <span className="emoji">{emoji}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
