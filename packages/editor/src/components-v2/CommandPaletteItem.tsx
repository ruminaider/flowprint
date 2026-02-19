import type { ComponentType } from 'react'

export interface Command {
  id: string
  label: string
  icon?: ComponentType<{ size?: number; className?: string }>
  shortcut?: string
  category: string
  action: () => void
}

interface CommandPaletteItemProps {
  command: Command
  active: boolean
  onSelect: (command: Command) => void
}

export function CommandPaletteItem({ command, active, onSelect }: CommandPaletteItemProps) {
  const Icon = command.icon
  const className = `fp-command-palette__item${active ? ' fp-command-palette__item--active' : ''}`

  return (
    <div
      className={className}
      role="option"
      aria-selected={active}
      onClick={() => { onSelect(command) }}
    >
      {Icon && (
        <span className="fp-command-palette__item-icon">
          <Icon size={16} />
        </span>
      )}
      <span className="fp-command-palette__item-label">{command.label}</span>
      {command.shortcut && (
        <span className="fp-command-palette__shortcut">{command.shortcut}</span>
      )}
    </div>
  )
}
