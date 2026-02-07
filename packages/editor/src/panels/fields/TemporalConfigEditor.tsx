import { useCallback } from 'react'
import type { TemporalConfig } from '@ruminaider/flowprint-schema'

export interface TemporalConfigEditorProps {
  config: TemporalConfig | undefined
  onChange: (config: TemporalConfig | undefined) => void
}

export function TemporalConfigEditor({ config, onChange }: TemporalConfigEditorProps) {
  const handleToggle = useCallback(() => {
    if (config) {
      onChange(undefined)
    } else {
      onChange({})
    }
  }, [config, onChange])

  const handleFieldChange = useCallback(
    (field: keyof TemporalConfig, value: string) => {
      onChange({ ...config, [field]: value || undefined })
    },
    [config, onChange],
  )

  const handleRetryFieldChange = useCallback(
    (field: string, value: string) => {
      const retry = config?.retry ?? {}
      if (field === 'max_attempts' || field === 'backoff_coefficient') {
        const num = parseFloat(value)
        if (isNaN(num)) {
          const rest: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(retry)) {
            if (k !== field) rest[k] = v
          }
          const nextRetry = Object.keys(rest).length > 0 ? rest : undefined
          onChange({ ...config, retry: nextRetry })
        } else {
          onChange({ ...config, retry: { ...retry, [field]: num } })
        }
      } else {
        onChange({ ...config, retry: { ...retry, [field]: value || undefined } })
      }
    },
    [config, onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Temporal Config</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleToggle}
          aria-label={config ? 'Remove temporal config' : 'Add temporal config'}
        >
          {config ? 'x' : '+'}
        </button>
      </div>
      {config && (
        <div className="fp-panel-subsection">
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Start-to-close timeout</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={config.start_to_close_timeout ?? ''}
              onChange={(e) => {
                handleFieldChange('start_to_close_timeout', e.target.value)
              }}
              placeholder="e.g. 30s, 5m"
              aria-label="Start-to-close timeout"
            />
          </div>
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Schedule-to-close timeout</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={config.schedule_to_close_timeout ?? ''}
              onChange={(e) => {
                handleFieldChange('schedule_to_close_timeout', e.target.value)
              }}
              placeholder="e.g. 1h"
              aria-label="Schedule-to-close timeout"
            />
          </div>
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Heartbeat timeout</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={config.heartbeat_timeout ?? ''}
              onChange={(e) => {
                handleFieldChange('heartbeat_timeout', e.target.value)
              }}
              placeholder="e.g. 10s"
              aria-label="Heartbeat timeout"
            />
          </div>
          <div className="fp-panel-section">
            <div className="fp-panel-section-header">
              <span>Retry</span>
            </div>
            <div className="fp-panel-field">
              <label className="fp-panel-field-label">Max attempts</label>
              <input
                type="number"
                className="fp-panel-field-input"
                value={config.retry?.max_attempts ?? ''}
                onChange={(e) => {
                  handleRetryFieldChange('max_attempts', e.target.value)
                }}
                placeholder="0"
                aria-label="Max attempts"
              />
            </div>
            <div className="fp-panel-field">
              <label className="fp-panel-field-label">Backoff coefficient</label>
              <input
                type="number"
                className="fp-panel-field-input"
                value={config.retry?.backoff_coefficient ?? ''}
                onChange={(e) => {
                  handleRetryFieldChange('backoff_coefficient', e.target.value)
                }}
                placeholder="2.0"
                aria-label="Backoff coefficient"
              />
            </div>
            <div className="fp-panel-field">
              <label className="fp-panel-field-label">Initial interval</label>
              <input
                type="text"
                className="fp-panel-field-input"
                value={config.retry?.initial_interval ?? ''}
                onChange={(e) => {
                  handleRetryFieldChange('initial_interval', e.target.value)
                }}
                placeholder="e.g. 1s"
                aria-label="Initial interval"
              />
            </div>
            <div className="fp-panel-field">
              <label className="fp-panel-field-label">Max interval</label>
              <input
                type="text"
                className="fp-panel-field-input"
                value={config.retry?.max_interval ?? ''}
                onChange={(e) => {
                  handleRetryFieldChange('max_interval', e.target.value)
                }}
                placeholder="e.g. 1m"
                aria-label="Max interval"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
