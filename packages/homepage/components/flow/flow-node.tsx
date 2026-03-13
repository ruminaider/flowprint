interface FlowNodeProps {
  id?: string
  cx: number
  cy: number
  type: 'action' | 'switch' | 'terminal'
  label: string
  width?: number
  className?: string
}

const TYPE_COLORS = {
  action: { stroke: 'rgba(255,146,67,0.3)', badge: '#FF9243', text: 'ACTION' },
  switch: { stroke: 'rgba(163,116,255,0.3)', badge: '#A374FF', text: 'SWITCH' },
  terminal: { stroke: '', badge: '#3FDC77', text: '' },
}

export function FlowNode({ id, cx, cy, type, label, width = 80, className = '' }: FlowNodeProps) {
  const colors = TYPE_COLORS[type]
  const halfW = width / 2

  if (type === 'terminal') {
    return (
      <g className={`node-group ntype-terminal ${className}`} id={id} transform={`translate(${cx},${cy})`}>
        <circle className="node-circle" cx={0} cy={0} r={13} />
        <text className="node-label" x={0} y={0} fontSize="8.5">{label}</text>
      </g>
    )
  }

  return (
    <g className={`node-group ntype-${type} ${className}`} id={id} transform={`translate(${cx},${cy})`}>
      <rect className="node-rect" x={-halfW} y={-15} width={width} height={30} style={{ stroke: colors.stroke }} />
      <text className="node-type-badge" x={0} y={-6} fill={colors.badge}>{colors.text}</text>
      <text className="node-label" x={0} y={6}>{label}</text>
    </g>
  )
}
