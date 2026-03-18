import type { ComponentType } from 'react'
import { ShieldBadgeIcon, LandmarkBadgeIcon, KeyBadgeIcon, EyeBadgeIcon } from './icons'

export type DataClass = 'pii' | 'financial' | 'credentials' | 'internal'

interface BadgeDef {
  icon: ComponentType<{ size?: number; className?: string }>
  colorVar: string
  label: string
}

const BADGE_MAP: Record<DataClass, BadgeDef> = {
  pii: { icon: ShieldBadgeIcon, colorVar: 'var(--fp-badge-pii)', label: 'PII' },
  financial: { icon: LandmarkBadgeIcon, colorVar: 'var(--fp-badge-financial)', label: 'Financial' },
  credentials: {
    icon: KeyBadgeIcon,
    colorVar: 'var(--fp-badge-credentials)',
    label: 'Credentials',
  },
  internal: { icon: EyeBadgeIcon, colorVar: 'var(--fp-badge-internal)', label: 'Internal' },
}

export interface DataClassBadgesProps {
  /** Classifications explicitly set on this element */
  explicit?: DataClass[]
  /** Classifications inherited from the lane (shown at 50% opacity) */
  inherited?: DataClass[]
  /** Icon size in pixels (default 12) */
  size?: number
}

export function DataClassBadges({
  explicit = [],
  inherited = [],
  size = 12,
}: DataClassBadgesProps) {
  const allClasses = [...new Set([...explicit, ...inherited])]
  if (allClasses.length === 0) return null

  return (
    <div className="fp-data-badges" data-testid="data-class-badges">
      {allClasses.map((dc) => {
        const badge = BADGE_MAP[dc]
        const Icon = badge.icon
        const isExplicit = explicit.includes(dc)

        return (
          <span
            key={dc}
            className="fp-data-badge"
            data-testid={`data-badge-${dc}`}
            data-inherited={!isExplicit ? 'true' : undefined}
            title={`${badge.label}${isExplicit ? '' : ' (inherited from lane)'}`}
            style={{
              color: badge.colorVar,
              opacity: isExplicit ? 1 : 0.5,
            }}
          >
            <Icon size={size} />
          </span>
        )
      })}
    </div>
  )
}
