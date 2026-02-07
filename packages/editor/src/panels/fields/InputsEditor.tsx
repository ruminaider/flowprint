import { useCallback } from 'react'

export interface InputsEditorProps {
  inputs: Record<string, string> | undefined
  onChange: (inputs: Record<string, string> | undefined) => void
}

export function InputsEditor({ inputs, onChange }: InputsEditorProps) {
  const handleToggle = useCallback(() => {
    if (inputs) {
      onChange(undefined)
    } else {
      onChange({})
    }
  }, [inputs, onChange])

  const handleAddRow = useCallback(() => {
    onChange({ ...inputs, '': '' })
  }, [inputs, onChange])

  const handleRemoveRow = useCallback(
    (key: string) => {
      if (!inputs) return
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(inputs)) {
        if (k !== key) next[k] = v
      }
      onChange(Object.keys(next).length > 0 ? next : {})
    },
    [inputs, onChange],
  )

  const handleKeyChange = useCallback(
    (oldKey: string, newKey: string) => {
      if (!inputs) return
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(inputs)) {
        next[k === oldKey ? newKey : k] = v
      }
      onChange(next)
    },
    [inputs, onChange],
  )

  const handleValueChange = useCallback(
    (key: string, value: string) => {
      if (!inputs) return
      onChange({ ...inputs, [key]: value })
    },
    [inputs, onChange],
  )

  const entries = inputs ? Object.entries(inputs) : []

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Inputs</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleToggle}
          aria-label={inputs ? 'Remove inputs' : 'Add inputs'}
        >
          {inputs ? 'x' : '+'}
        </button>
      </div>
      {inputs && (
        <div className="fp-panel-subsection">
          {entries.map(([key, value], i) => (
            <div key={i} className="fp-panel-list-item">
              <input
                type="text"
                className="fp-panel-field-input"
                value={key}
                onChange={(e) => {
                  handleKeyChange(key, e.target.value)
                }}
                placeholder="name"
                aria-label={`Input ${String(i + 1)} name`}
              />
              <input
                type="text"
                className="fp-panel-field-input"
                value={value}
                onChange={(e) => {
                  handleValueChange(key, e.target.value)
                }}
                placeholder="expression"
                aria-label={`Input ${String(i + 1)} value`}
              />
              <button
                type="button"
                className="fp-panel-remove-btn"
                onClick={() => {
                  handleRemoveRow(key)
                }}
                aria-label={`Remove input ${String(i + 1)}`}
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            className="fp-panel-add-btn"
            onClick={handleAddRow}
            aria-label="Add input row"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
