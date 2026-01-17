import { useCallback } from 'react'

export interface SwitchCase {
  when: string
  next: string
}

export interface SwitchCaseEditorProps {
  cases: SwitchCase[]
  onChange: (cases: SwitchCase[]) => void
}

export function SwitchCaseEditor({ cases, onChange }: SwitchCaseEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([...cases, { when: '', next: '' }])
  }, [cases, onChange])

  const handleRemove = useCallback(
    (index: number) => {
      onChange(cases.filter((_, i) => i !== index))
    },
    [cases, onChange],
  )

  const handleUpdate = useCallback(
    (index: number, field: keyof SwitchCase, value: string) => {
      const updated = cases.map((c, i) => (i === index ? { ...c, [field]: value } : c))
      onChange(updated)
    },
    [cases, onChange],
  )

  return (
    <div className="fp-panel-section">
      <div className="fp-panel-section-header">
        <span>Cases</span>
        <button
          type="button"
          className="fp-panel-add-btn"
          onClick={handleAdd}
          aria-label="Add case"
        >
          +
        </button>
      </div>
      {cases.map((c, i) => (
        <div key={i} className="fp-panel-list-item">
          <input
            type="text"
            className="fp-panel-field-input"
            value={c.when}
            onChange={(e) => {
              handleUpdate(i, 'when', e.target.value)
            }}
            placeholder="when"
            aria-label={`Case ${String(i + 1)} when`}
          />
          <input
            type="text"
            className="fp-panel-field-input"
            value={c.next}
            onChange={(e) => {
              handleUpdate(i, 'next', e.target.value)
            }}
            placeholder="next"
            aria-label={`Case ${String(i + 1)} next`}
          />
          <button
            type="button"
            className="fp-panel-remove-btn"
            onClick={() => {
              handleRemove(i)
            }}
            aria-label={`Remove case ${String(i + 1)}`}
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
