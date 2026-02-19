import { LaneHeader } from './LaneHeader'

export interface LaneBackgroundLane {
  id: string
  label: string
  color: string
  y: number
  height: number
  collapsed: boolean
  lineOfVisibilityBelow?: boolean
}

export interface LaneBackgroundProps {
  lanes: LaneBackgroundLane[]
  totalWidth: number
  collapsedLaneIds: Set<string>
  onToggleCollapse: (laneId: string) => void
  onRename: (laneId: string, newName: string) => void
  onDragStart?: (e: React.DragEvent, laneId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

const COLLAPSED_HEIGHT = 36

export function LaneBackground({
  lanes,
  totalWidth,
  collapsedLaneIds,
  onToggleCollapse,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}: LaneBackgroundProps) {
  return (
    <>
      {lanes.map((lane) => {
        const isCollapsed = collapsedLaneIds.has(lane.id)
        const laneHeight = isCollapsed ? COLLAPSED_HEIGHT : lane.height
        const className = [
          'fp-lane',
          isCollapsed ? 'fp-lane--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={lane.id}
            className={className}
            style={
              {
                top: lane.y,
                width: totalWidth,
                height: laneHeight,
                '--lane-color': lane.color,
              } as React.CSSProperties
            }
            data-lane-id={lane.id}
          >
            <LaneHeader
              laneId={lane.id}
              name={lane.label}
              color={lane.color}
              collapsed={isCollapsed}
              onToggleCollapse={onToggleCollapse}
              onRename={onRename}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />

            <div className="fp-lane__body" />

            {lane.lineOfVisibilityBelow && !isCollapsed && (
              <div className="fp-lane__lov">
                <span className="fp-lane__lov-badge">Line of Visibility</span>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
