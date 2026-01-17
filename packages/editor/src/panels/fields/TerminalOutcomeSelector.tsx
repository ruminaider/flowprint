import { useCallback } from 'react'

export interface TerminalOutcomeSelectorProps {
  outcome: 'success' | 'failure'
  onChange: (outcome: 'success' | 'failure') => void
}

export function TerminalOutcomeSelector({ outcome, onChange }: TerminalOutcomeSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as 'success' | 'failure')
    },
    [onChange],
  )

  return (
    <div className="fp-panel-field">
      <label className="fp-panel-field-label">Outcome</label>
      <select
        className="fp-panel-field-select"
        value={outcome}
        onChange={handleChange}
        aria-label="Outcome"
      >
        <option value="success">Success</option>
        <option value="failure">Failure</option>
      </select>
    </div>
  )
}
