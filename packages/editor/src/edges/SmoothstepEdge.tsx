import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'

function SmoothstepEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  const isActive = selected ?? hovered
  const strokeColor = selected
    ? 'var(--fp-color-primary)'
    : 'var(--fp-text-tertiary)'
  const strokeWidth = isActive ? 3 : 2

  return (
    <>
      <path
        d={edgePath}
        className="fp-edge-hover-target"
        strokeWidth={15}
        stroke="transparent"
        fill="none"
        onMouseEnter={() => { setHovered(true) }}
        onMouseLeave={() => { setHovered(false) }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          pointerEvents: 'none',
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className={`fp-edge-delete${hovered ? ' fp-edge-delete--visible' : ''}`}
          style={{ left: labelX, top: labelY }}
          onClick={() => {
            const onDelete = (data)
              ?.onDelete as ((edgeId: string) => void) | undefined
            onDelete?.(id)
          }}
        >
          &times;
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(SmoothstepEdge)
