import { useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

export interface BottomPanelProps {
  isOpen: boolean
  onClose: () => void
  yamlContent: string
  validationErrors: Array<{ message: string; path?: string }>
}

const STORAGE_KEY = 'fp-bottom-panel-height'
const DEFAULT_HEIGHT = 200
const MIN_HEIGHT = 150
const MAX_HEIGHT = 400

type Tab = 'yaml' | 'validation'

export function BottomPanel({
  isOpen,
  onClose,
  yamlContent,
  validationErrors,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('yaml')
  const [height, setHeight] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = Number(stored)
        if (!Number.isNaN(parsed) && parsed >= MIN_HEIGHT && parsed <= MAX_HEIGHT) {
          return parsed
        }
      }
    } catch {
      // localStorage unavailable
    }
    return DEFAULT_HEIGHT
  })

  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const delta = startY.current - e.clientY
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight.current + delta))
    setHeight(newHeight)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    setHeight((h) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(h))
      } catch {
        // localStorage unavailable
      }
      return h
    })
  }, [handleMouseMove])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startY.current = e.clientY
      startHeight.current = height
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [height, handleMouseMove, handleMouseUp],
  )

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  if (!isOpen) return null

  return (
    <div className="fp-bottom-panel" style={{ height }}>
      <div
        className="fp-bottom-panel__resize"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize panel"
      />
      <div className="fp-bottom-panel__header">
        <button
          type="button"
          className={`fp-bottom-panel__tab${activeTab === 'yaml' ? ' fp-bottom-panel__tab--active' : ''}`}
          onClick={() => { setActiveTab('yaml') }}
        >
          YAML
        </button>
        <button
          type="button"
          className={`fp-bottom-panel__tab${activeTab === 'validation' ? ' fp-bottom-panel__tab--active' : ''}`}
          onClick={() => { setActiveTab('validation') }}
        >
          Validation
        </button>
        <button
          type="button"
          className="fp-bottom-panel__close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>
      <div className="fp-bottom-panel__content">
        {activeTab === 'yaml' ? (
          <pre className="fp-bottom-panel__yaml">{yamlContent}</pre>
        ) : (
          <ul className="fp-bottom-panel__error-list">
            {validationErrors.map((error, index) => (
              <li key={index} className="fp-bottom-panel__error-item">
                {error.message}
                {error.path && (
                  <div className="fp-bottom-panel__error-path">{error.path}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
