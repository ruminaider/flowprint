import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface SwitchNodeData {
  label: string
  laneColor: string
  isUnassigned?: boolean
}

function SwitchNodeRenderer({ data, selected }: NodeProps) {
  const { label, laneColor, isUnassigned } = data as unknown as SwitchNodeData

  return (
    <div
      className={`fp-node fp-node-switch${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{
        borderColor: laneColor,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-diamond">
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(SwitchNodeRenderer)
