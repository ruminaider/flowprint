import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface ParallelNodeData {
  label: string
  laneColor: string
  isUnassigned?: boolean
}

function ParallelNodeRenderer({ data, selected }: NodeProps) {
  const { label, laneColor, isUnassigned } = data as unknown as ParallelNodeData

  return (
    <div
      className={`fp-node fp-node-parallel${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{
        borderColor: laneColor,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-parallel-bars">
        <div className="fp-parallel-bar fp-parallel-bar-top" />
        <span className="fp-node-label">{label}</span>
        <div className="fp-parallel-bar fp-parallel-bar-bottom" />
      </div>
      <Handle type="source" position={Position.Right} />
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(ParallelNodeRenderer)
