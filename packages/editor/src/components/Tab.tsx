import { X, LayoutGrid } from 'lucide-react'
import { getNodeSpec } from '../nodes/registry'

export interface TabProps {
  id: string
  label: string
  type: string
  active: boolean
  closable: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function Tab({
  id,
  label,
  type,
  active,
  closable,
  onSelect,
  onClose,
}: TabProps) {
  const spec = getNodeSpec(type)
  const Icon = type === 'graph' ? LayoutGrid : spec?.icon

  const className = `fp-tab${active ? ' fp-tab--active' : ''}`

  return (
    <div
      role="tab"
      tabIndex={0}
      className={className}
      onClick={() => { onSelect(id) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(id)
        }
      }}
      aria-selected={active}
      data-testid={`tab-${id}`}
    >
      {Icon && (
        <span className="fp-tab__icon">
          <Icon size={16} />
        </span>
      )}
      <span className="fp-tab__label">{label}</span>
      {closable && (
        <button
          type="button"
          className="fp-tab__close"
          aria-label={`Close ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onClose(id)
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
