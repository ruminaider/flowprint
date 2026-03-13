import type { RippleObj } from './simulation-data'

interface Lane {
  y: number
  height: number
  label: string
  labelY: number
}

interface ArrowMarker {
  id: string
  fill: string
}

interface FlowSvgShellProps {
  isActive: boolean
  ripples: RippleObj[]
  lanes: [Lane, Lane, Lane]
  markers: ArrowMarker[]
  children: React.ReactNode
}

export function FlowSvgShell({ isActive, ripples, lanes, markers, children }: FlowSvgShellProps) {
  return (
    <svg
      className={`flow-svg${isActive ? ' active-svg' : ''}`}
      viewBox="0 0 900 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {markers.map((m) => (
          <marker
            key={m.id}
            id={m.id}
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0.5, 8 3, 0 5.5" fill={m.fill} />
          </marker>
        ))}
      </defs>

      {/* Lane backgrounds */}
      {lanes.map((l) => (
        <rect
          key={l.label}
          className="lane-bg-rect"
          x="4"
          y={l.y}
          width="892"
          height={l.height}
          rx="8"
        />
      ))}

      {/* Lane labels */}
      {lanes.map((l) => (
        <text key={l.label} className="lane-label" x="16" y={l.labelY}>
          {l.label}
        </text>
      ))}

      {children}

      {/* Ripple layer */}
      <g>
        {ripples.map((r) => (
          <circle
            key={r.id}
            className="ripple-circle"
            cx={r.cx}
            cy={r.cy}
            r="4"
            stroke={r.color}
            style={{
              animation: `bridge-sim-ripple-expand 1.2s ${r.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            }}
          />
        ))}
      </g>
    </svg>
  )
}
