import { useState, useCallback, useRef, useEffect } from 'react'
import { useReactFlow, useOnViewportChange } from '@xyflow/react'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import { Island } from './Island'

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView, getZoom, getViewport, setViewport } = useReactFlow()
  const [zoomPercent, setZoomPercent] = useState(() => Math.round(getZoom() * 100))
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useOnViewportChange({
    onChange: (viewport) => {
      setZoomPercent(Math.round(viewport.zoom * 100))
    },
  })

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handlePercentageClick = useCallback(() => {
    setEditValue(String(zoomPercent))
    setIsEditing(true)
  }, [zoomPercent])

  const applyZoom = useCallback(
    (value: string) => {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed) && parsed >= 10 && parsed <= 400) {
        const viewport = getViewport()
        void setViewport({ x: viewport.x, y: viewport.y, zoom: parsed / 100 })
      }
      setIsEditing(false)
    },
    [getViewport, setViewport],
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        applyZoom(editValue)
      } else if (e.key === 'Escape') {
        setIsEditing(false)
      }
    },
    [applyZoom, editValue],
  )

  const handleInputBlur = useCallback(() => {
    applyZoom(editValue)
  }, [applyZoom, editValue])

  return (
    <Island className="fp-zoom-controls">
      <button
        type="button"
        className="fp-zoom-controls__button"
        aria-label="Zoom out"
        onClick={() => { void zoomOut() }}
      >
        <Minus size={16} />
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          min={10}
          max={400}
          className="fp-zoom-controls__percentage-input"
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value) }}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          aria-label="Zoom percentage"
        />
      ) : (
        <button
          type="button"
          className="fp-zoom-controls__percentage"
          onClick={handlePercentageClick}
          aria-label="Zoom percentage"
        >
          {zoomPercent}%
        </button>
      )}

      <button
        type="button"
        className="fp-zoom-controls__button"
        aria-label="Zoom in"
        onClick={() => { void zoomIn() }}
      >
        <Plus size={16} />
      </button>

      <button
        type="button"
        className="fp-zoom-controls__button"
        aria-label="Fit to view"
        onClick={() => { void fitView({ padding: 0.1 }) }}
      >
        <Maximize2 size={16} />
      </button>
    </Island>
  )
}
