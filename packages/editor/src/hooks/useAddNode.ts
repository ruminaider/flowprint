import { useCallback } from 'react'
import type { Node } from '@ruminaider/flowprint-schema'
import type { UseFlowprintStateReturn } from './useFlowprintState'
import { snapToLane } from './useLaneSnap'
import type { LaneBand } from '../layout/types'

// ---------------------------------------------------------------------------
// Node type constant
// ---------------------------------------------------------------------------

const NODE_TYPE_MIME = 'application/flowprint-node-type'

export const PALETTE_NODE_TYPES = [
  'action',
  'switch',
  'parallel',
  'wait',
  'error',
  'terminal',
] as const

export type PaletteNodeType = (typeof PALETTE_NODE_TYPES)[number]

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let counter = 0

/** Exported for testing — resets the module-level counter. */
export function resetCounter(): void {
  counter = 0
}

function nextId(type: PaletteNodeType): string {
  counter += 1
  return `new_${type}_${counter}`
}

// ---------------------------------------------------------------------------
// Default node templates
// ---------------------------------------------------------------------------

function defaultNode(type: PaletteNodeType, lane: string): Node {
  switch (type) {
    case 'action':
      return { type: 'action', lane, label: 'New Action' }
    case 'switch':
      return {
        type: 'switch',
        lane,
        label: 'New Switch',
        cases: [{ when: 'condition', next: '' }],
      } as Node
    case 'parallel':
      return {
        type: 'parallel',
        lane,
        label: 'New Parallel',
        branches: [''],
        join: '',
      } as Node
    case 'wait':
      return { type: 'wait', lane, label: 'New Wait', event: 'event_name' }
    case 'error':
      return { type: 'error', lane, label: 'New Error' }
    case 'terminal':
      return { type: 'terminal', lane, label: 'New Terminal', outcome: 'success' }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAddNode(
  state: UseFlowprintStateReturn,
  lanes: LaneBand[],
): {
  onDrop: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
} {
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData(NODE_TYPE_MIME) as PaletteNodeType
      if (!type || !PALETTE_NODE_TYPES.includes(type)) return

      const dropY = event.clientY
      const snap = snapToLane(dropY, lanes)
      const lane = snap?.laneId ?? ''

      const id = nextId(type)
      const node = defaultNode(type, lane)

      state.addNode(id, node)
    },
    [state, lanes],
  )

  return { onDrop, onDragOver }
}
