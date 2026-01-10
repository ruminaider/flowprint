import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TerminalNode as TerminalNodeType } from '@ruminaider/flowprint-schema'
import { UnassignedBadge } from '../components/UnassignedBadge'

interface TerminalNodeData {
  label: string
  nodeData: TerminalNodeType
  laneColor: string
  isUnassigned?: boolean
}

function TerminalNodeRenderer({ data, selected }: NodeProps) {
  const { label, nodeData, isUnassigned } = data as unknown as TerminalNodeData
  const isSuccess = nodeData.outcome === 'success'

  return (
    <div
      className={`fp-node fp-node-terminal ${isSuccess ? 'fp-node-terminal-success' : 'fp-node-terminal-failure'}${selected ? ' fp-node-selected' : ''}${isUnassigned ? ' fp-node-unassigned' : ''}`}
      style={{ position: 'relative' }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        <span className="fp-node-label">{label}</span>
      </div>
      <UnassignedBadge visible={isUnassigned ?? false} />
    </div>
  )
}

export default memo(TerminalNodeRenderer)
