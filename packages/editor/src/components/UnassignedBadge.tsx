/**
 * Badge indicator for nodes that are not assigned to any lane.
 */

export const UNASSIGNED_NODE_CLASS = 'fp-node-unassigned'

export function isNodeUnassigned(laneId: string, lanes: Record<string, unknown>): boolean {
  return laneId === '' || !(laneId in lanes)
}

interface UnassignedBadgeProps {
  visible: boolean
}

export function UnassignedBadge({ visible }: UnassignedBadgeProps) {
  if (!visible) return null

  return (
    <div
      className="fp-unassigned-badge"
      style={{
        position: 'absolute',
        top: -6,
        right: -6,
        width: 16,
        height: 16,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Unassigned node warning"
      >
        <path
          d="M7.134 2.5a1 1 0 0 1 1.732 0l5.196 9a1 1 0 0 1-.866 1.5H2.804a1 1 0 0 1-.866-1.5l5.196-9Z"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="0.5"
        />
        <text
          x="8"
          y="11.5"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#fff"
        >
          !
        </text>
      </svg>
    </div>
  )
}
