import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface ErrorNodeData {
  label: string
  laneColor: string
}

function ErrorNodeRenderer({ data }: NodeProps) {
  const { label } = data as unknown as ErrorNodeData

  return (
    <div className="fp-node fp-node-error">
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(ErrorNodeRenderer)
