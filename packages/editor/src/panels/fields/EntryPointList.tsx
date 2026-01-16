import { useCallback } from 'react'
import type { EntryPoint } from '@ruminaider/flowprint-schema'
import type { SymbolSearchProvider } from '../../symbols/types'
import { EntryPointPicker } from './EntryPointPicker'

export interface EntryPointListProps {
  entries: EntryPoint[]
  onChange: (entries: EntryPoint[]) => void
  symbolSearch?: SymbolSearchProvider
}

export function EntryPointList({ entries, onChange, symbolSearch }: EntryPointListProps) {
  const handleAdd = useCallback(() => {
    onChange([...entries, { file: '', symbol: '' }])
  }, [entries, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      onChange(entries.filter((_, i) => i !== index))
    },
    [entries, onChange],
  )

  const handleUpdate = useCallback(
    (index: number, field: keyof EntryPoint, value: string) => {
      const updated = entries.map((ep, i) =>
        i === index ? { ...ep, [field]: value } : ep,
      )
      onChange(updated)
    },
    [entries, onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Entry Points</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleAdd}
          aria-label="Add entry point"
        >
          +
        </button>
      </div>
      {entries.map((ep, i) => (
        <div key={i} className="fp-panel-list-item">
          {symbolSearch ? (
            <EntryPointPicker
              file={ep.file}
              symbol={ep.symbol}
              onChange={(entry) => {
                const updated = entries.map((e, idx) =>
                  idx === i ? entry : e,
                )
                onChange(updated)
              }}
              symbolSearch={symbolSearch}
              ariaLabelPrefix={`Entry point ${String(i + 1)}`}
            />
          ) : (
            <>
              <input
                type="text"
                className="fp-panel-field-input"
                value={ep.file}
                onChange={(e) => { handleUpdate(i, 'file', e.target.value); }}
                placeholder="file"
                aria-label={`Entry point ${String(i + 1)} file`}
              />
              <input
                type="text"
                className="fp-panel-field-input"
                value={ep.symbol}
                onChange={(e) => { handleUpdate(i, 'symbol', e.target.value); }}
                placeholder="symbol"
                aria-label={`Entry point ${String(i + 1)} symbol`}
              />
            </>
          )}
          <button
            type="button"
            className="fp-panel-remove-btn"
            onClick={() => { handleRemove(i); }}
            aria-label={`Remove entry point ${String(i + 1)}`}
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
