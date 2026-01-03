import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface ParallelNodeData {
  label: string
  laneColor: string
}

function ParallelNodeRenderer({ data }: NodeProps) {
  const { label, laneColor } = data as unknown as ParallelNodeData

  return (
    <div
      className="fp-node fp-node-parallel"
      style={{
        borderColor: laneColor,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-parallel-bars">
        <div className="fp-parallel-bar fp-parallel-bar-top" />
        <span className="fp-node-label">{label}</span>
        <div className="fp-parallel-bar fp-parallel-bar-bottom" />
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(ParallelNodeRenderer)
