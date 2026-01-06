import { useCallback } from 'react'

export interface WaitEventEditorProps {
  event: string
  timeout?: string
  onChange: (patch: { event?: string; timeout?: string }) => void
}

export function WaitEventEditor({ event, timeout, onChange }: WaitEventEditorProps) {
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
    </div>
  )
}
