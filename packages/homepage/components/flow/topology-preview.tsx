'use client'

/**
 * Renders a compact SVG flow diagram from topology data.
 * Adapted from packages/app TopologyPreview for the marketing site.
 */

interface TopologyPreviewProps {
  topo: {
    lanes: number
    nodes: [number, number, string][]
    edges: [number, number][]
  }
  width?: number
  height?: number
  className?: string
  expanded?: boolean
}

const TYPE_COLOR: Record<string, string> = {
  a: '#FF9243', // action — orange
  s: '#A374FF', // switch — purple
  p: '#A374FF', // parallel — purple
  w: '#F59E0B', // wait — amber
  e: '#FF362B', // error — red
  t: '#3FDC77', // terminal — green
}

const LANE_COLORS = [
  'rgba(255, 107, 107, 0.12)', // customer/claimant
  'rgba(228, 70, 255, 0.10)', // routing/agent
  'rgba(6, 182, 212, 0.10)',  // fulfillment/adjuster
  'rgba(163, 116, 255, 0.08)', // legal
  'rgba(255, 146, 67, 0.08)',  // finance
]

export function TopologyPreview({
  topo,
  width = 320,
  height = 140,
  className = '',
  expanded = false,
}: TopologyPreviewProps) {
  const { lanes, nodes, edges } = topo
  const pad = expanded ? { x: 44, y: 18 } : { x: 36, y: 12 }
  const maxCol = Math.max(...nodes.map((n) => n[0]))
  const colW = maxCol > 0 ? (width - pad.x * 2) / maxCol : 0
  const fullLaneH = height / lanes
  const laneH = (height - pad.y * 2) / lanes
  const r = expanded
    ? Math.max(6, Math.min(9, 10 - lanes * 0.5))
    : Math.max(4, Math.min(7, 8 - lanes * 0.4))

  const pos = nodes.map(([col, lane]) => ({
    x: pad.x + col * colW,
    y: pad.y + lane * laneH + laneH / 2,
  }))

  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Lane bands */}
      {Array.from({ length: lanes }, (_, i) => (
        <rect
          key={`lane-${i}`}
          x={0}
          y={i * fullLaneH}
          width={width}
          height={fullLaneH}
          fill={LANE_COLORS[i % LANE_COLORS.length]}
        />
      ))}

      {/* Edges */}
      {edges.map(([from, to], i) => {
        const a = pos[from]
        const b = pos[to]
        if (!a || !b) return null

        if (Math.abs(a.y - b.y) < 1) {
          return (
            <line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#6b4d40"
              strokeWidth={expanded ? 1.2 : 0.8}
              opacity={0.5}
            />
          )
        }

        const midX = (a.x + b.x) / 2
        return (
          <path
            key={`e-${i}`}
            d={`M${a.x},${a.y} C${midX},${a.y} ${midX},${b.y} ${b.x},${b.y}`}
            fill="none"
            stroke="#6b4d40"
            strokeWidth={expanded ? 1.2 : 0.8}
            opacity={0.4}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map(([, , type], i) => {
        const p = pos[i]
        if (!p) return null
        const color = TYPE_COLOR[type] ?? '#6b5a4d'
        return <NodeShape key={`n-${i}`} x={p.x} y={p.y} type={type} color={color} r={r} />
      })}
    </svg>
  )
}

function NodeShape({
  x,
  y,
  type,
  color,
  r,
}: {
  x: number
  y: number
  type: string
  color: string
  r: number
}) {
  switch (type) {
    case 't':
      return (
        <circle
          cx={x}
          cy={y}
          r={r * 0.7}
          fill={color}
          opacity={0.5}
          stroke={color}
          strokeWidth={0.8}
        />
      )

    case 's': {
      const d = r * 0.85
      return (
        <rect
          x={x - d}
          y={y - d}
          width={d * 2}
          height={d * 2}
          rx={1.5}
          transform={`rotate(45 ${x} ${y})`}
          fill={color}
          opacity={0.35}
          stroke={color}
          strokeWidth={0.8}
        />
      )
    }

    case 'p': {
      const hw = r * 1.1
      const hh = r * 0.7
      return (
        <g>
          <rect
            x={x - hw}
            y={y - hh}
            width={hw * 2}
            height={hh * 2}
            rx={2}
            fill={color}
            opacity={0.3}
            stroke={color}
            strokeWidth={0.8}
          />
          <line
            x1={x - hw * 0.4}
            y1={y - hh * 0.5}
            x2={x - hw * 0.4}
            y2={y + hh * 0.5}
            stroke={color}
            strokeWidth={0.6}
            opacity={0.7}
          />
          <line
            x1={x + hw * 0.4}
            y1={y - hh * 0.5}
            x2={x + hw * 0.4}
            y2={y + hh * 0.5}
            stroke={color}
            strokeWidth={0.6}
            opacity={0.7}
          />
        </g>
      )
    }

    case 'w':
      return (
        <g>
          <circle
            cx={x}
            cy={y}
            r={r * 0.85}
            fill={color}
            opacity={0.25}
            stroke={color}
            strokeWidth={0.8}
          />
          <line
            x1={x}
            y1={y - r * 0.3}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={0.7}
            opacity={0.8}
          />
          <line
            x1={x}
            y1={y}
            x2={x + r * 0.25}
            y2={y + r * 0.15}
            stroke={color}
            strokeWidth={0.7}
            opacity={0.8}
          />
        </g>
      )

    case 'e':
      return (
        <rect
          x={x - r * 0.7}
          y={y - r * 0.7}
          width={r * 1.4}
          height={r * 1.4}
          rx={1}
          fill={color}
          opacity={0.35}
          stroke={color}
          strokeWidth={0.8}
        />
      )

    default:
      return (
        <rect
          x={x - r}
          y={y - r * 0.6}
          width={r * 2}
          height={r * 1.2}
          rx={2.5}
          fill={color}
          opacity={0.3}
          stroke={color}
          strokeWidth={0.8}
        />
      )
  }
}
