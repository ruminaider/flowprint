import { useCallback } from 'react'

export interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function TextField({ label, value, onChange }: TextFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <div className="fp-panel-field">
      <label className="fp-panel-field-label">{label}</label>
      <input
        type="text"
        className="fp-panel-field-input"
        value={value}
        onChange={handleChange}
        aria-label={label}
      />
    </div>
  )
}
