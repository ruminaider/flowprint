export function FlowDefs({ prefix = '' }: { prefix?: string }) {
  return (
    <defs>
      <marker id={`${prefix}arrow`} markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
        <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40" />
      </marker>
      <marker id={`${prefix}arrow-green`} markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
        <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77" />
      </marker>
      <marker id={`${prefix}arrow-red`} markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
        <polygon points="0 0.5, 8 3, 0 5.5" fill="#FF362B" />
      </marker>
    </defs>
  )
}
