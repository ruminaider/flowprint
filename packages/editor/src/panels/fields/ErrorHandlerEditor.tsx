import { useCallback } from 'react'
import type { ErrorHandler } from '@ruminaider/flowprint-schema'

export interface ErrorHandlerEditorProps {
  error: ErrorHandler | undefined
  onChange: (error: ErrorHandler | undefined) => void
}

export function ErrorHandlerEditor({ error, onChange }: ErrorHandlerEditorProps) {
  const handleToggle = useCallback(() => {
    if (error) {
      onChange(undefined)
    } else {
      onChange({})
    }
  }, [error, onChange])

  const handleCatchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...error, catch: e.target.value || undefined })
    },
    [error, onChange],
  )

  const handleRetryLimitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const limit = parseInt(e.target.value, 10)
      if (isNaN(limit)) {
        const current = error ?? {}
        const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'retry'))
        onChange(Object.keys(rest).length > 0 ? (rest as typeof current) : undefined)
      } else {
        onChange({
          ...error,
          retry: { ...error?.retry, limit, backoff: error?.retry?.backoff },
        })
      }
    },
    [error, onChange],
  )

  const handleBackoffChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const backoff = e.target.value as 'linear' | 'exponential' | ''
      if (error?.retry) {
        onChange({
          ...error,
          retry: {
            ...error.retry,
            backoff: backoff || undefined,
          },
        })
      }
    },
    [error, onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Error Handler</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleToggle}
          aria-label={error ? 'Remove error handler' : 'Add error handler'}
        >
          {error ? 'x' : '+'}
        </button>
      </div>
      {error && (
        <div className="fp-panel-subsection">
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Catch node</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={error.catch ?? ''}
              onChange={handleCatchChange}
              placeholder="node ID"
              aria-label="Catch node"
            />
          </div>
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Retry limit</label>
            <input
              type="number"
              className="fp-panel-field-input"
              value={error.retry?.limit ?? ''}
              onChange={handleRetryLimitChange}
              placeholder="0"
              aria-label="Retry limit"
            />
          </div>
          {error.retry && (
            <div className="fp-panel-field">
              <label className="fp-panel-field-label">Backoff</label>
              <select
                className="fp-panel-field-select"
                value={error.retry.backoff ?? ''}
                onChange={handleBackoffChange}
                aria-label="Backoff strategy"
              >
                <option value="">None</option>
                <option value="linear">Linear</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
