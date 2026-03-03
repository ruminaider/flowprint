import {
  LANE_COLORS,
  DARK_LANE_COLORS,
  LANE_COLOR_COUNT,
} from '@ruminaider/flowprint-editor'
import type { TemplateTopo } from '../data/templates'

export interface TopologyPreviewProps {
  topo: TemplateTopo
  width: number
  height: number
  isDark: boolean
}

const TYPE_COLOR: Record<string, string> = {
  a: '#10B981',
  s: '#3B82F6',
  p: '#A374FF',
  w: '#F59E0B',
  e: '#EF4444',
  t: '#6B6A85',
}

export function TopologyPreview({ topo, width, height, isDark }: TopologyPreviewProps) {
  const laneColors = isDark ? DARK_LANE_COLORS : LANE_COLORS
  const pad = { x: 36, y: 12 }
  const { lanes, nodes, edges } = topo
  const maxCol = Math.max(...nodes.map((n) => n[0]))
  const colW = maxCol > 0 ? (width - pad.x * 2) / maxCol : 0
  const laneH = (height - pad.y * 2) / lanes
  const r = Math.max(5, Math.min(7, 8 - lanes * 0.4))

  const pos = nodes.map(([col, lane]) => ({
    x: pad.x + col * colW,
    y: pad.y + lane * laneH + laneH / 2,
  }))

  const fullLaneH = height / lanes

  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Lane bands */}
      {Array.from({ length: lanes }, (_, i) => (
        <rect
          key={`lane-${String(i)}`}
          x={0}
          y={i * fullLaneH}
          width={width}
          height={fullLaneH}
          fill={laneColors[i % LANE_COLOR_COUNT] ?? '#1e2e3e'}
          opacity={isDark ? 0.6 : 0.5}
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
              key={`edge-${String(i)}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--fp-text-secondary, #8887A5)"
              strokeWidth={1}
              opacity={0.5}
            />
          )
        }
        const midX = (a.x + b.x) / 2
        return (
          <path
            key={`edge-${String(i)}`}
            d={`M${String(a.x)},${String(a.y)} C${String(midX)},${String(a.y)} ${String(midX)},${String(b.y)} ${String(b.x)},${String(b.y)}`}
            stroke="var(--fp-text-secondary, #8887A5)"
            strokeWidth={1}
            fill="none"
            opacity={0.4}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map(([, , type], idx) => {
        const p = pos[idx]
        if (!p) return null
        const c = TYPE_COLOR[type] ?? '#6B6A85'
        return <NodeShape key={`node-${String(idx)}`} type={type} x={p.x} y={p.y} r={r} color={c} />
      })}
    </svg>
  )
}

function NodeShape({
  type,
  x,
  y,
  r,
  color,
}: {
  type: string
  x: number
  y: number
  r: number
  color: string
}) {
  switch (type) {
    case 's': {
      // Diamond (rotated square)
      const d = r * 0.85
      return (
        <rect
          x={x - d}
          y={y - d}
          width={d * 2}
          height={d * 2}
          rx={1.5}
          transform={`rotate(45 ${String(x)} ${String(y)})`}
          fill={color}
          opacity={0.4}
          stroke={color}
          strokeWidth={0.8}
        />
      )
    }
    case 't':
      // Terminal: filled circle
      return <circle cx={x} cy={y} r={r * 0.65} fill={color} opacity={0.6} />
    case 'p':
      // Parallel: rect with vertical bars
      return (
        <g>
          <rect
            x={x - r}
            y={y - r}
            width={r * 2}
            height={r * 2}
            rx={2.5}
            fill={color}
            opacity={0.3}
            stroke={color}
            strokeWidth={0.8}
          />
          <line
            x1={x - 2}
            y1={y - r + 2.5}
            x2={x - 2}
            y2={y + r - 2.5}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
          />
          <line
            x1={x + 2}
            y1={y - r + 2.5}
            x2={x + 2}
            y2={y + r - 2.5}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
          />
        </g>
      )
    case 'w':
      // Wait: clock circle with hands
      return (
        <g>
          <circle
            cx={x}
            cy={y}
            r={r}
            fill={color}
            opacity={0.25}
            stroke={color}
            strokeWidth={0.8}
          />
          <line
            x1={x}
            y1={y - r * 0.4}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
          />
          <line
            x1={x}
            y1={y}
            x2={x + r * 0.35}
            y2={y + r * 0.2}
            stroke={color}
            strokeWidth={1}
            opacity={0.7}
          />
        </g>
      )
    case 'e':
      // Error: rect
      return (
        <rect
          x={x - r}
          y={y - r}
          width={r * 2}
          height={r * 2}
          rx={1.5}
          fill={color}
          opacity={0.3}
          stroke={color}
          strokeWidth={0.8}
        />
      )
    default:
      // Action: rounded rect
      return (
        <rect
          x={x - r}
          y={y - r * 0.75}
          width={r * 2}
          height={r * 1.5}
          rx={2.5}
          fill={color}
          opacity={0.3}
          stroke={color}
          strokeWidth={0.8}
        />
      )
  }
}
