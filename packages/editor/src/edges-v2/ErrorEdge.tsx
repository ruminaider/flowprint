import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'

function ErrorEdge({
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

  const strokeWidth = selected || hovered ? 3 : 2

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
          stroke: 'var(--fp-color-error)',
          strokeWidth,
          strokeDasharray: '6 3',
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

export default memo(ErrorEdge)
