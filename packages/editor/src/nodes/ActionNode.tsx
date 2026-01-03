import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ActionNode as ActionNodeType } from '@ruminaider/flowprint-schema'

interface ActionNodeData {
  label: string
  nodeData: ActionNodeType
  laneColor: string
}

function ActionNodeRenderer({ data }: NodeProps) {
  const { label, nodeData, laneColor } = data as unknown as ActionNodeData
  const hasEntryPoints = (nodeData.entry_points?.length ?? 0) > 0

  return (
    <div
      className="fp-node fp-node-action"
      style={{
        borderLeft: `4px solid ${laneColor}`,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        {hasEntryPoints && <span className="fp-entry-badge" title="Has entry points" />}
        <span className="fp-node-label">{label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default memo(ActionNodeRenderer)
