import { useCallback, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { LaneBand } from '../layout/types'
import { MIN_LANE_HEIGHT } from '../layout/constants'

export interface ResizeOverride {
  laneId: string
  height: number
}

interface DragState {
  laneIndex: number
  laneId: string
  startY: number
  startHeight: number
}

interface UseFlowprintStateLike {
  resizeLane: (id: string, newHeight: number, oldEffectiveHeight: number) => void
}

export function useLaneResize(
  state: UseFlowprintStateLike,
  bands: LaneBand[],
  zoomRef: MutableRefObject<number>,
  readOnly: boolean,
) {
  const [resizeOverride, setResizeOverride] = useState<ResizeOverride | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  const handlePointerDown = useCallback(
    (laneIndex: number, event: React.PointerEvent) => {
      if (readOnly) return
      const band = bands[laneIndex]
      if (!band) return

      event.preventDefault()
      event.stopPropagation()

      const drag: DragState = {
        laneIndex,
        laneId: band.laneId,
        startY: event.clientY,
        startHeight: band.height,
      }
      dragRef.current = drag
      setIsResizing(true)

      const onPointerMove = (e: PointerEvent) => {
        const d = dragRef.current
        if (!d) return
        const zoom = zoomRef.current
        const deltaScreen = e.clientY - d.startY
        const deltaFlow = deltaScreen / zoom
        const newHeight = Math.max(MIN_LANE_HEIGHT, d.startHeight + deltaFlow)
        setResizeOverride({ laneId: d.laneId, height: newHeight })
      }

      const onPointerUp = (e: PointerEvent) => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)

        const d = dragRef.current
        if (d) {
          const zoom = zoomRef.current
          const deltaScreen = e.clientY - d.startY
          const deltaFlow = deltaScreen / zoom
          const finalHeight = Math.max(MIN_LANE_HEIGHT, d.startHeight + deltaFlow)
          state.resizeLane(d.laneId, finalHeight, d.startHeight)
        }

        dragRef.current = null
        setResizeOverride(null)
        setIsResizing(false)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [readOnly, bands, zoomRef, state],
  )

  return { resizeOverride, handlePointerDown, isResizing }
}
