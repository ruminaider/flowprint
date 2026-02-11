import { memo, useMemo } from 'react'
import { useViewport } from '@xyflow/react'
import type { LaneBand } from '../layout/types'
import { LANE_LABEL_WIDTH } from '../layout/constants'
import type { ResizeOverride } from '../hooks/useLaneResize'

interface LaneBackgroundProps {
  lanes: LaneBand[]
  totalWidth: number
  highlightedLaneId?: string | null
  readOnly?: boolean
  resizeOverride?: ResizeOverride | null
  onResizeHandlePointerDown?: (laneIndex: number, event: React.PointerEvent) => void
  isResizing?: boolean
}

export function applyResizeOverride(
  lanes: LaneBand[],
  override: ResizeOverride | null,
): LaneBand[] {
  if (!override) return lanes
  const result: LaneBand[] = []
  let currentY = 0
  for (const lane of lanes) {
    const height = lane.laneId === override.laneId ? override.height : lane.height
    result.push({ ...lane, y: currentY, height })
    currentY += height
  }
  return result
}

function LaneBackground({
  lanes,
  totalWidth,
  highlightedLaneId,
  readOnly,
  resizeOverride,
  onResizeHandlePointerDown,
  isResizing,
}: LaneBackgroundProps) {
  const { x, y, zoom } = useViewport()

  const effectiveLanes = useMemo(
    () => applyResizeOverride(lanes, resizeOverride ?? null),
    [lanes, resizeOverride],
  )

  const transform = `translate(${String(x)}px, ${String(y)}px) scale(${String(zoom)})`

  return (
    <>
      {/* Lane background fills — z-index: -1 so they sit behind nodes */}
      <div
        className="fp-lane-backgrounds"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform,
          transformOrigin: '0 0',
          pointerEvents: 'none',
          width: totalWidth,
        }}
      >
        {effectiveLanes.map((lane, index) => (
          <div
            key={lane.laneId}
            className={`fp-lane-band${highlightedLaneId === lane.laneId ? ' fp-lane-band--highlight' : ''}`}
            data-lane-id={lane.laneId}
            data-lane-index={index}
            style={{
              position: 'absolute',
              top: lane.y,
              left: 0,
              width: '100%',
              height: lane.height,
            }}
          >
            <div
              className="fp-lane-label"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: LANE_LABEL_WIDTH,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 13,
                writingMode: 'vertical-lr',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
                userSelect: 'none',
              }}
            >
              {lane.label}
            </div>
          </div>
        ))}
      </div>

      {/* Resize handles — separate layer above ReactFlow pane */}
      {!readOnly && (
        <div
          className="fp-lane-resize-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            width: totalWidth,
            zIndex: 4,
          }}
        >
          {effectiveLanes.map((lane, index) =>
            index < effectiveLanes.length - 1 ? (
              <div
                key={lane.laneId}
                className={`fp-lane-resize-handle${isResizing ? ' fp-lane-resize-handle--active' : ''}`}
                style={{
                  position: 'absolute',
                  top: lane.y + lane.height - 4,
                  left: 0,
                  width: '100%',
                  height: 8,
                  cursor: 'row-resize',
                  pointerEvents: 'auto',
                }}
                onPointerDown={(e) => {
                  onResizeHandlePointerDown?.(index, e)
                }}
              />
            ) : null,
          )}
        </div>
      )}
    </>
  )
}

export default memo(LaneBackground)
