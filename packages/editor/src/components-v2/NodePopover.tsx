import { useEffect, useRef } from 'react'
import { Island } from './Island'
import { getNodeSpec } from '../nodes-v2/registry'
import { computePopoverPosition } from '../hooks-v2/usePopoverPosition'

export interface NodePopoverProps {
  nodeId: string
  nodeType: string
  nodeData: Record<string, unknown>
  nodePosition: { x: number; y: number }
  nodeWidth: number
  nodeHeight: number
  lanes: { id: string; label: string }[]
  viewportWidth: number
  viewportHeight: number
  onChange: (data: Record<string, unknown>) => void
  onOpenEditor: (nodeId: string) => void
  onClose: () => void
}

const POPOVER_WIDTH = 280

export function NodePopover({
  nodeId,
  nodeType,
  nodeData,
  nodePosition,
  nodeWidth,
  nodeHeight,
  lanes,
  viewportWidth,
  viewportHeight,
  onChange,
  onOpenEditor,
  onClose,
}: NodePopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const spec = getNodeSpec(nodeType)
  const Icon = spec?.icon
  const PropertiesComponent = spec?.renderProperties

  const position = computePopoverPosition({
    nodePosition,
    nodeWidth,
    nodeHeight,
    popoverWidth: POPOVER_WIDTH,
    viewportWidth,
    viewportHeight,
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  if (!position) {
    return null
  }

  return (
    <div
      ref={ref}
      className="fp-node-popover"
      style={{ top: position.top, left: position.left }}
    >
      <Island>
        <div className="fp-node-popover__header">
          {Icon && (
            <span className="fp-node-popover__header-icon">
              <Icon size={16} />
            </span>
          )}
          <span>{spec?.displayName ?? nodeType}</span>
        </div>
        <div className="fp-node-popover__body">
          {PropertiesComponent && (
            <PropertiesComponent
              nodeId={nodeId}
              data={nodeData}
              lanes={lanes}
              onChange={onChange}
            />
          )}
        </div>
        <div className="fp-node-popover__footer">
          <button
            type="button"
            className="fp-node-popover__open-editor"
            onClick={() => { onOpenEditor(nodeId) }}
          >
            Open Full Editor
          </button>
        </div>
      </Island>
    </div>
  )
}
