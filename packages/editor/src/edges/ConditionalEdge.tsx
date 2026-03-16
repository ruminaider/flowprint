import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { EdgeSimulationOverlay } from './EdgeSimulationOverlay'

function ConditionalEdge({
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
  const label = (data)?.label as
    | string
    | undefined

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
      <EdgeSimulationOverlay edgeId={id} edgePath={edgePath} />
      <EdgeLabelRenderer>
        {label && (
          <div
            className="fp-edge-label"
            style={{ left: labelX, top: labelY }}
          >
            {label}
          </div>
        )}
        <button
          type="button"
          className={`fp-edge-delete${hovered ? ' fp-edge-delete--visible' : ''}`}
          style={{ left: labelX, top: labelY - 24 }}
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

export default memo(ConditionalEdge)
