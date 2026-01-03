import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface SwitchNodeData {
  label: string
  laneColor: string
}

function SwitchNodeRenderer({ data }: NodeProps) {
  const { label, laneColor } = data as unknown as SwitchNodeData

  return (
    <div
      className="fp-node fp-node-switch"
      style={{
        borderColor: laneColor,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-diamond">
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(SwitchNodeRenderer)
