import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface ErrorNodeData {
  label: string
  laneColor: string
  isUnassigned?: boolean
}

function ErrorNodeRenderer({ data, selected }: NodeProps) {
  const { label, isUnassigned } = data as unknown as ErrorNodeData

  return (
    <div
      className={`fp-node fp-node-error${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{ position: 'relative' }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(ErrorNodeRenderer)
