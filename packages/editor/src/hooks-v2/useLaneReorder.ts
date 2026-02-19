import { useState, useCallback } from 'react'

const DRAG_DATA_KEY = 'application/x-flowprint-lane-id'

export interface UseLaneReorderReturn {
  onDragStart: (e: React.DragEvent, laneId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetLaneId: string) => void
  dragOverLaneId: string | null
}

export function useLaneReorder(
  laneIds: string[],
  onReorder: (orderedIds: string[]) => void,
): UseLaneReorderReturn {
  const [dragOverLaneId, setDragOverLaneId] = useState<string | null>(null)

  const onDragStart = useCallback(
    (e: React.DragEvent, laneId: string) => {
      e.dataTransfer.setData(DRAG_DATA_KEY, laneId)
      e.dataTransfer.effectAllowed = 'move'
    },
    [],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const target = (e.currentTarget as HTMLElement).closest('[data-lane-id]')
    const targetId = target?.getAttribute('data-lane-id') ?? null
    setDragOverLaneId(targetId)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent, targetLaneId: string) => {
      e.preventDefault()
      setDragOverLaneId(null)

      const sourceLaneId = e.dataTransfer.getData(DRAG_DATA_KEY)
      if (!sourceLaneId || sourceLaneId === targetLaneId) return

      const sourceIndex = laneIds.indexOf(sourceLaneId)
      const targetIndex = laneIds.indexOf(targetLaneId)
      if (sourceIndex === -1 || targetIndex === -1) return

      const next = laneIds.filter((id) => id !== sourceLaneId)
      const insertAt = next.indexOf(targetLaneId)
      next.splice(insertAt, 0, sourceLaneId)

      onReorder(next)
    },
    [laneIds, onReorder],
  )

  return {
    onDragStart,
    onDragOver,
    onDrop,
    dragOverLaneId,
  }
}
