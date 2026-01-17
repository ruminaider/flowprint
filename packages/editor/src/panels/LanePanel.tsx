import { useState } from 'react'
import type { FlowprintDocument, Lane } from '@ruminaider/flowprint-schema'

/**
 * Props for {@link LanePanel}.
 */
export interface LanePanelProps {
  /** The current Flowprint document. Used to read lanes and check for nodes. */
  doc: FlowprintDocument
  /** Callback to add a new lane with the given ID and definition. */
  onAddLane: (id: string, lane: Lane) => void
  /** Callback to apply a partial update to a lane. */
  onUpdateLane: (id: string, patch: Partial<Lane>) => void
  /** Callback to remove a lane by ID. Warns if the lane has nodes. */
  onRemoveLane: (id: string) => void
  /** Callback to reorder lanes by providing an ordered array of lane IDs. */
  onReorderLanes: (orderedIds: string[]) => void
}

function laneHasNodes(doc: FlowprintDocument, laneId: string): boolean {
  return Object.values(doc.nodes).some((n) => n.lane === laneId)
}

function getSortedLaneEntries(doc: FlowprintDocument): [string, Lane][] {
  return Object.entries(doc.lanes).sort(([, a], [, b]) => a.order - b.order)
}

function generateLaneId(existingIds: string[]): string {
  let n = 1
  while (existingIds.includes(`new_lane_${String(n)}`)) {
    n++
  }
  return `new_lane_${String(n)}`
}

function getNextOrder(lanes: Record<string, Lane>): number {
  const orders = Object.values(lanes).map((l) => l.order)
  return orders.length > 0 ? Math.max(...orders) + 1 : 0
}

/**
 * Panel for managing swim lanes (add, rename, reorder, toggle visibility, delete).
 *
 * Displays sorted lanes with inline editing controls. Deletion of lanes that
 * still contain nodes requires a confirmation click.
 *
 * @example
 * ```tsx
 * <LanePanel
 *   doc={doc}
 *   onAddLane={state.addLane}
 *   onUpdateLane={state.updateLane}
 *   onRemoveLane={state.removeLane}
 *   onReorderLanes={state.reorderLanes}
 * />
 * ```
 */
export function LanePanel({
  doc,
  onAddLane,
  onUpdateLane,
  onRemoveLane,
  onReorderLanes,
}: LanePanelProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const sortedLanes = getSortedLaneEntries(doc)

  function handleAddLane() {
    const id = generateLaneId(Object.keys(doc.lanes))
    const nextOrder = getNextOrder(doc.lanes)
    const lane: Lane = {
      label: 'New Lane',
      visibility: 'internal',
      order: nextOrder,
    }
    onAddLane(id, lane)
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return
    const ids = sortedLanes.map(([id]) => id)
    const prev = ids[index - 1]
    const curr = ids[index]
    if (prev === undefined || curr === undefined) return
    ids[index - 1] = curr
    ids[index] = prev
    onReorderLanes(ids)
  }

  function handleMoveDown(index: number) {
    if (index >= sortedLanes.length - 1) return
    const ids = sortedLanes.map(([id]) => id)
    const curr = ids[index]
    const next = ids[index + 1]
    if (curr === undefined || next === undefined) return
    ids[index] = next
    ids[index + 1] = curr
    onReorderLanes(ids)
  }

  function handleDelete(laneId: string) {
    if (laneHasNodes(doc, laneId) && pendingDelete !== laneId) {
      setPendingDelete(laneId)
      return
    }
    setPendingDelete(null)
    onRemoveLane(laneId)
  }

  return (
    <div className="fp-lane-panel">
      <h3>Lanes</h3>
      <ul>
        {sortedLanes.map(([id, lane], index) => (
          <li key={id} className="fp-lane-item">
            <span className="fp-lane-drag-handle" aria-hidden="true">
              &#x2630;
            </span>
            <input
              type="text"
              value={lane.label}
              aria-label={`Lane label for ${id}`}
              onChange={(e) => {
                onUpdateLane(id, { label: e.target.value })
              }}
            />
            <button
              type="button"
              onClick={() => {
                onUpdateLane(id, {
                  visibility: lane.visibility === 'external' ? 'internal' : 'external',
                })
              }}
              aria-label={`Toggle visibility for ${id}`}
            >
              {lane.visibility}
            </button>
            <button
              type="button"
              aria-label={`Move ${id} up`}
              disabled={index === 0}
              onClick={() => {
                handleMoveUp(index)
              }}
            >
              &uarr;
            </button>
            <button
              type="button"
              aria-label={`Move ${id} down`}
              disabled={index === sortedLanes.length - 1}
              onClick={() => {
                handleMoveDown(index)
              }}
            >
              &darr;
            </button>
            <button
              type="button"
              aria-label={`Delete ${id}`}
              onClick={() => {
                handleDelete(id)
              }}
            >
              Delete
            </button>
            {pendingDelete === id && (
              <span className="fp-lane-warning" role="alert">
                This lane has nodes
              </span>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={handleAddLane}>
        Add Lane
      </button>
    </div>
  )
}
