import type { ComponentType } from 'react'
import { Tooltip } from './Tooltip'

export interface ToolbarButtonProps {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  shortcut?: string
  active?: boolean
  colorVar?: string
  onClick: () => void
}

export function ToolbarButton({
  icon: Icon,
  label,
  shortcut,
  active,
  colorVar,
  onClick,
}: ToolbarButtonProps) {
  const tooltipText = shortcut ? `${label} (${shortcut})` : label
  const className = `fp-toolbar__button${active ? ' fp-toolbar__button--active' : ''}`
  const style = colorVar ? { '--btn-accent': `var(${colorVar})` } as React.CSSProperties : undefined

  return (
    <Tooltip text={tooltipText}>
      <button
        type="button"
        className={className}
        style={style}
        onClick={onClick}
        aria-label={label}
      >
        <span className="fp-toolbar__button-icon">
          <Icon size={20} />
        </span>
        <span className="fp-toolbar__button-label">{label}</span>
      </button>
    </Tooltip>
  )
}
