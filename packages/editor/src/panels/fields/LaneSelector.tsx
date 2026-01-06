import { useCallback } from 'react'
import type { Lane } from '@ruminaider/flowprint-schema'

export interface LaneSelectorProps {
  value: string
  lanes: Record<string, Lane>
  onChange: (laneId: string) => void
}

export function LaneSelector({ value, lanes, onChange }: LaneSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <div className="fp-panel-field">
      <label className="fp-panel-field-label">Lane</label>
      <select
        className="fp-panel-field-select"
        value={value}
        onChange={handleChange}
        aria-label="Lane"
      >
        {Object.entries(lanes).map(([id, lane]) => (
          <option key={id} value={id}>
            {lane.label}
          </option>
        ))}
      </select>
    </div>
  )
}
