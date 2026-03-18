import { useState } from 'react'
import type { MigrationResult } from '@ruminaider/flowprint-schema'

export interface MigrationBannerProps {
  result: MigrationResult
  onDismiss?: () => void
}

export function MigrationBanner({ result, onDismiss }: MigrationBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (result.status === 'current') return null

  const variant =
    result.status === 'migrated'
      ? 'info'
      : result.status === 'future_version'
        ? 'warning'
        : 'error'

  const message =
    result.status === 'migrated'
      ? `Migrated from ${result.fromVersion} \u2192 ${result.toVersion}`
      : result.status === 'future_version'
        ? `This document uses ${result.documentVersion}. Update your tool to edit it.`
        : `Migration failed at ${result.error.failedRule}: ${result.error.reason}`

  return (
    <div className={`fp-migration-banner fp-migration-banner--${variant}`} role="status">
      <span className="fp-migration-banner__message">{message}</span>
      {result.status === 'migrated' && result.changelog.entries.length > 0 && (
        <button
          className="fp-migration-banner__toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}
      {onDismiss && variant === 'info' && (
        <button className="fp-migration-banner__dismiss" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
      {expanded && result.status === 'migrated' && (
        <ul className="fp-migration-banner__changelog">
          {result.changelog.entries.map((entry, i) => (
            <li key={i}>
              <strong>{entry.version}</strong>: {entry.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
