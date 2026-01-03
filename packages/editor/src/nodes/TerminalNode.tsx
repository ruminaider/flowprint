import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TerminalNode as TerminalNodeType } from '@ruminaider/flowprint-schema'

interface TerminalNodeData {
  label: string
  nodeData: TerminalNodeType
  laneColor: string
}

function TerminalNodeRenderer({ data }: NodeProps) {
  const { label, nodeData } = data as unknown as TerminalNodeData
  const isSuccess = nodeData.outcome === 'success'

  return (
    <div
      className={`fp-node fp-node-terminal ${isSuccess ? 'fp-node-terminal-success' : 'fp-node-terminal-failure'}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="fp-node-content">
        <span className="fp-node-label">{label}</span>
      </div>
    </div>
  )
}

export default memo(TerminalNodeRenderer)
