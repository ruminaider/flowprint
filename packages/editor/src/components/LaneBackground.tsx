import { memo } from 'react'
import { useViewport } from '@xyflow/react'
import type { LaneBand } from '../layout/types'
import { LANE_LABEL_WIDTH } from '../layout/constants'

interface LaneBackgroundProps {
  lanes: LaneBand[]
  totalWidth: number
}

function LaneBackground({ lanes, totalWidth }: LaneBackgroundProps) {
  const { x, y, zoom } = useViewport()

  return (
    <div
      className="fp-lane-backgrounds"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${String(x)}px, ${String(y)}px) scale(${String(zoom)})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
        width: totalWidth,
      }}
    >
      {lanes.map((lane) => (
        <div
          key={lane.laneId}
          className="fp-lane-band"
          data-lane-id={lane.laneId}
          style={{
            position: 'absolute',
            top: lane.y,
            left: 0,
            width: '100%',
            height: lane.height,
            backgroundColor: lane.color,
            borderBottom: `1px solid ${lane.borderColor}`,
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
              borderRight: `2px solid ${lane.borderColor}`,
              fontWeight: 600,
              fontSize: 13,
              color: '#374151',
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
  )
}

export default memo(LaneBackground)
