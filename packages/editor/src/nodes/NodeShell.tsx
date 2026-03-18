import type { ComponentType, ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MoreHorizontal } from 'lucide-react'
import { DataClassBadges } from '../components/DataClassBadges'
import type { DataClass } from '../components/DataClassBadges'

export interface NodeShellProps {
  nodeId: string
  type: string
  label: string
  description?: string
  subtitle?: string
  selected?: boolean
  isUnassigned?: boolean
  hasError?: boolean
  colorVar: string
  icon: ComponentType<{ size?: number; className?: string }>
  /** Data classifications explicitly set on this node */
  dataClass?: DataClass[]
  /** Data classifications inherited from the node's lane */
  laneDataClass?: DataClass[]
  onMenuClick?: (e: React.MouseEvent) => void
  children?: ReactNode
}

export function NodeShell({
  nodeId,
  type,
  label,
  description,
  subtitle,
  selected,
  isUnassigned,
  hasError,
  colorVar,
  icon: Icon,
  dataClass,
  laneDataClass,
  onMenuClick,
  children,
}: NodeShellProps) {
  const classNames = [
    'fp-node',
    selected && 'fp-node--selected',
    isUnassigned && 'fp-node--unassigned',
    hasError && 'fp-node--error',
  ]
    .filter(Boolean)
    .join(' ')

  // Determine which classifications are inherited (on lane but not on node)
  const explicitClasses = dataClass ?? []
  const inheritedClasses = (laneDataClass ?? []).filter((dc) => !explicitClasses.includes(dc))

  const hasBadges = explicitClasses.length > 0 || inheritedClasses.length > 0

  return (
    <div
      className={classNames}
      data-node-type={type}
      data-testid={`node-${nodeId}`}
      style={
        {
          '--node-accent': `var(${colorVar})`,
          '--node-accent-subtle': `var(${colorVar}-subtle)`,
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} />
      {hasBadges && (
        <div className="fp-node__badges">
          <DataClassBadges explicit={explicitClasses} inherited={inheritedClasses} />
        </div>
      )}
      <div className="fp-node__header">
        <div className="fp-node__icon">
          <Icon size={16} />
        </div>
        <div className="fp-node__title-group">
          <div className="fp-node__name" title={label}>
            {label}
          </div>
          {subtitle && (
            <div className="fp-node__subtitle" data-testid="node-subtitle">
              {subtitle}
            </div>
          )}
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
