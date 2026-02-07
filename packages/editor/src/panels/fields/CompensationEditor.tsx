import { useCallback } from 'react'
import type { EntryPoint } from '@ruminaider/flowprint-schema'

export interface CompensationEditorProps {
  compensation: EntryPoint | undefined
  onChange: (comp: EntryPoint | undefined) => void
}

export function CompensationEditor({ compensation, onChange }: CompensationEditorProps) {
  const handleToggle = useCallback(() => {
    if (compensation) {
      onChange(undefined)
    } else {
      onChange({ file: '', symbol: '' })
    }
  }, [compensation, onChange])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!compensation) return
      onChange({ ...compensation, file: e.target.value })
    },
    [compensation, onChange],
  )

  const handleSymbolChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!compensation) return
      onChange({ ...compensation, symbol: e.target.value })
    },
    [compensation, onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Compensation</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleToggle}
          aria-label={compensation ? 'Remove compensation' : 'Add compensation'}
        >
          {compensation ? 'x' : '+'}
        </button>
      </div>
      {compensation && (
        <div className="fp-panel-subsection">
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">File</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={compensation.file}
              onChange={handleFileChange}
              placeholder="file path"
              aria-label="Compensation file"
            />
          </div>
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Symbol</label>
            <input
              type="text"
              className="fp-panel-field-input"
              value={compensation.symbol}
              onChange={handleSymbolChange}
              placeholder="function name"
              aria-label="Compensation symbol"
            />
          </div>
        </div>
      )}
    </div>
  )
}
