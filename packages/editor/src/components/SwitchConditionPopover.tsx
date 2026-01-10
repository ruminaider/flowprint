import { useEffect, useRef, useState } from 'react'
import type { PendingSwitchConnection } from '../hooks/useConnectionHandler'

export interface SwitchConditionPopoverProps {
  connection: PendingSwitchConnection
  onConfirm: (when: string, isDefault?: boolean) => void
  onCancel: () => void
  position?: { x: number; y: number }
}

export function SwitchConditionPopover({
  onConfirm,
  onCancel,
  position,
}: SwitchConditionPopoverProps) {
  const [when, setWhen] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const canConfirm = isDefault || when.trim().length > 0

  const containerStyle: React.CSSProperties = {
    background: 'white',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: 12,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    minWidth: 260,
    ...(position
      ? { position: 'absolute', left: position.x, top: position.y }
      : {}),
  }

  return (
    <div className="fp-popover" style={containerStyle}>
      <label>
        Condition
        <input
          ref={inputRef}
          className="fp-popover-input"
          type="text"
          placeholder="e.g., status === 'approved'"
          value={when}
          onChange={(e) => { setWhen(e.target.value); }}
          disabled={isDefault}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </label>

      <div
        className="fp-popover-checkbox"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}
      >
        <input
          type="checkbox"
          id="fp-make-default"
          checked={isDefault}
          onChange={(e) => { setIsDefault(e.target.checked); }}
        />
        <label htmlFor="fp-make-default">Make Default</label>
      </div>

      <div
        className="fp-popover-actions"
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 12,
          justifyContent: 'flex-end',
        }}
      >
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => { onConfirm(when, isDefault || undefined); }}
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
