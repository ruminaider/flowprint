import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { WaitNode as WaitNodeType } from '@ruminaider/flowprint-schema'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface WaitNodeData {
  label: string
  nodeData: WaitNodeType
  laneColor: string
  isUnassigned?: boolean
}

function WaitNodeRenderer({ data, selected }: NodeProps) {
  const { label, nodeData, laneColor, isUnassigned } = data as unknown as WaitNodeData

  return (
    <div
      className={`fp-node fp-node-wait${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{
        borderColor: laneColor,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        <span className="fp-wait-icon" title="Wait/Timer">
          &#9203;
        </span>
        <div className="fp-wait-details">
          <span className="fp-node-label">{label}</span>
          <span className="fp-wait-event">{nodeData.event}</span>
          {nodeData.timeout && <span className="fp-wait-timeout">timeout: {nodeData.timeout}</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(WaitNodeRenderer)
