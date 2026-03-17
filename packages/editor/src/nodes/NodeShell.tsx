import type { ComponentType, ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MoreHorizontal } from 'lucide-react'
import { useNodeHighlight } from '../contexts/SimulationContext'

export interface NodeShellProps {
  nodeId: string
  type: string
  label: string
  description?: string
  selected?: boolean
  isUnassigned?: boolean
  hasError?: boolean
  colorVar: string
  icon: ComponentType<{ size?: number; className?: string }>
  onMenuClick?: (e: React.MouseEvent) => void
  children?: ReactNode
}

export function NodeShell({
  nodeId,
  type,
  label,
  description,
  selected,
  isUnassigned,
  hasError,
  colorVar,
  icon: Icon,
  onMenuClick,
  children,
}: NodeShellProps) {
  const simState = useNodeHighlight(nodeId)

  const classNames = [
    'fp-node',
    selected && 'fp-node--selected',
    isUnassigned && 'fp-node--unassigned',
    hasError && 'fp-node--error',
    simState === 'active' && 'fp-node--sim-active',
    simState === 'visited' && 'fp-node--sim-visited',
    simState === 'error' && 'fp-node--sim-error',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classNames}
      data-node-type={type}
      data-testid={`node-${nodeId}`}
      style={{
        '--node-accent': `var(${colorVar})`,
        '--node-accent-subtle': `var(${colorVar}-subtle)`,
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node__header">
        <div className="fp-node__icon">
          <Icon size={16} />
        </div>
        <div className="fp-node__name" title={label}>
          {label}
        </div>
        <div
          className="fp-node__menu"
          role="button"
          tabIndex={0}
          onClick={onMenuClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onMenuClick?.(e as unknown as React.MouseEvent)
            }
          }}
        >
          <MoreHorizontal size={16} />
        </div>
      </div>
      {description && <div className="fp-node__body">{description}</div>}
      {children}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
