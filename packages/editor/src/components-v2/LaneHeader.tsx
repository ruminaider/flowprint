import { useState, useRef, useCallback, useEffect } from 'react'
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react'

export interface LaneHeaderProps {
  laneId: string
  name: string
  color: string
  collapsed: boolean
  onToggleCollapse: (laneId: string) => void
  onRename: (laneId: string, newName: string) => void
  onDragStart?: (e: React.DragEvent, laneId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export function LaneHeader({
  laneId,
  name,
  color,
  collapsed,
  onToggleCollapse,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}: LaneHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const handleDoubleClick = useCallback(() => {
    setEditValue(name)
    setEditing(true)
  }, [name])

  const commitRename = useCallback(() => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      onRename(laneId, trimmed)
    }
  }, [editValue, name, laneId, onRename])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setEditValue(name)
  }, [name])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitRename()
      } else if (e.key === 'Escape') {
        cancelEditing()
      }
    },
    [commitRename, cancelEditing],
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      onDragStart?.(e, laneId)
    },
    [onDragStart, laneId],
  )

  const CollapseIcon = collapsed ? ChevronRight : ChevronDown

  return (
    <div
      className="fp-lane__header nopan"
      style={{ '--lane-color': color } as React.CSSProperties}
    >
      <div
        className="fp-lane__drag-handle"
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <GripVertical size={16} />
      </div>

      {editing ? (
        <input
          ref={inputRef}
          className="fp-lane__name-input"
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value) }}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          aria-label="Lane name"
        />
      ) : (
        <span
          className="fp-lane__name"
          onDoubleClick={handleDoubleClick}
        >
          {name}
        </span>
      )}

      <button
        className="fp-lane__chevron"
        onClick={() => { onToggleCollapse(laneId) }}
        aria-label={collapsed ? 'Expand lane' : 'Collapse lane'}
        type="button"
      >
        <CollapseIcon size={16} />
      </button>
    </div>
  )
}
