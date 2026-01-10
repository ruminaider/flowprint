import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ActionNode as ActionNodeType } from '@ruminaider/flowprint-schema'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface ActionNodeData {
  label: string
  nodeData: ActionNodeType
  laneColor: string
  isUnassigned?: boolean
}

function ActionNodeRenderer({ data, selected }: NodeProps) {
  const { label, nodeData, laneColor, isUnassigned } = data as unknown as ActionNodeData
  const hasEntryPoints = (nodeData.entry_points?.length ?? 0) > 0

  return (
    <div
      className={`fp-node fp-node-action${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{
        borderLeft: `4px solid ${laneColor}`,
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        {hasEntryPoints && <span className="fp-entry-badge" title="Has entry points" />}
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(ActionNodeRenderer)
