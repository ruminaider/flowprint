import { useCallback } from 'react'

export interface WaitEventEditorProps {
  event: string
  timeout?: string
  event_type?: string
  event_type_import?: string
  timeout_next?: string
  onChange: (patch: {
    event?: string
    timeout?: string
    event_type?: string
    event_type_import?: string
    timeout_next?: string
  }) => void
}

export function WaitEventEditor({
  event,
  timeout,
  event_type,
  event_type_import,
  timeout_next,
  onChange,
}: WaitEventEditorProps) {
  const handleEventChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ event: e.target.value })
    },
    [onChange],
  )

  const handleTimeoutChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ timeout: e.target.value || undefined })
    },
    [onChange],
  )

  const handleEventTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ event_type: e.target.value || undefined })
    },
    [onChange],
  )

  const handleEventTypeImportChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ event_type_import: e.target.value || undefined })
    },
    [onChange],
  )

  const handleTimeoutNextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ timeout_next: e.target.value || undefined })
    },
    [onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Wait Event</span>
      </div>
      <div className="fp-panel-field">
        <label className="fp-panel-field-label">Event</label>
        <input
          type="text"
          className="fp-panel-field-input"
          value={event}
          onChange={handleEventChange}
          placeholder="event name"
          aria-label="Event"
        />
      </div>
      <div className="fp-panel-field">
        <label className="fp-panel-field-label">Timeout</label>
        <input
          type="text"
          className="fp-panel-field-input"
          value={timeout ?? ''}
          onChange={handleTimeoutChange}
          placeholder="e.g. 7d, 24h"
          aria-label="Timeout"
        />
      </div>
      <div className="fp-panel-field">
        <label className="fp-panel-field-label">Event Type</label>
        <input
          type="text"
          className="fp-panel-field-input"
          value={event_type ?? ''}
          onChange={handleEventTypeChange}
          placeholder="e.g. ProviderAvailableSignal"
          aria-label="Event Type"
        />
      </div>
      <div className="fp-panel-field">
        <label className="fp-panel-field-label">Event Type Import</label>
        <input
          type="text"
          className="fp-panel-field-input"
          value={event_type_import ?? ''}
          onChange={handleEventTypeImportChange}
          placeholder="e.g. ./signals"
          aria-label="Event Type Import"
        />
      </div>
      <div className="fp-panel-field">
        <label className="fp-panel-field-label">Timeout Next</label>
        <input
          type="text"
          className="fp-panel-field-input"
          value={timeout_next ?? ''}
          onChange={handleTimeoutNextChange}
          placeholder="node ID for timeout path"
          aria-label="Timeout Next"
        />
      </div>
    </div>
  )
}
