import type { DragEvent } from 'react'
import { useCallback } from 'react'
import { PALETTE_NODE_TYPES, type PaletteNodeType } from '../hooks/useAddNode'

// ---------------------------------------------------------------------------
// Icons / labels per type
// ---------------------------------------------------------------------------

const TYPE_INDICATORS: Record<PaletteNodeType, { icon: string; label: string }> = {
  action: { icon: '\u25B6', label: 'Action' },
  switch: { icon: '\u25C7', label: 'Switch' },
  parallel: { icon: '\u2261', label: 'Parallel' },
  wait: { icon: '\u23F3', label: 'Wait' },
  error: { icon: '\u26A0', label: 'Error' },
  terminal: { icon: '\u25CF', label: 'Terminal' },
}

const NODE_TYPE_MIME = 'application/flowprint-node-type'

// ---------------------------------------------------------------------------
// PaletteItem
// ---------------------------------------------------------------------------

function PaletteItem({ type, dock }: { type: PaletteNodeType; dock?: boolean }) {
  const { icon, label } = TYPE_INDICATORS[type]

  const onDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData(NODE_TYPE_MIME, type)
      event.dataTransfer.effectAllowed = 'move'
    },
    [type],
  )

  return (
    <div
      className={`fp-palette-item fp-palette-item-${type}`}
      draggable
      onDragStart={onDragStart}
      title={dock ? label : undefined}
    >
      <span className="fp-palette-icon">{icon}</span>
      <span className="fp-palette-label">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NodePalette
// ---------------------------------------------------------------------------

/**
 * Props for {@link NodePalette}.
 */
export interface NodePaletteProps {
  /**
   * Display variant. `'panel'` renders the full palette with labels (default).
   * `'dock'` renders a compact icon-only bar with tooltip titles.
   */
  variant?: 'panel' | 'dock'
}

/**
 * Draggable palette of node types that can be dropped onto the editor canvas.
 *
 * Renders one draggable item per Flowprint node type (action, switch, parallel,
 * wait, error, terminal). Uses the HTML Drag and Drop API with a custom MIME type
 * to transfer the node type to the drop handler.
 */
export function NodePalette({ variant = 'panel' }: NodePaletteProps) {
  const dock = variant === 'dock'
  return (
    <div className={`fp-palette${dock ? ' fp-palette--dock' : ''}`}>
      {PALETTE_NODE_TYPES.map((type) => (
        <PaletteItem key={type} type={type} dock={dock} />
      ))}
    </div>
  )
}
