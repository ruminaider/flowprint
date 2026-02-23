import type { NodeProps } from '@xyflow/react'
import { CircleDot } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function TerminalNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data

  return (
    <NodeShell
      nodeId={id}
      type="terminal"
      label={(label as string | undefined) ?? 'Terminal'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-green"
      icon={CircleDot}
    />
  )
}

function TerminalProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function TerminalEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const terminalSpec: NodeSpec = {
  type: 'terminal',
  displayName: 'Terminal',
  icon: CircleDot,
  color: '--fp-node-green',
  shortcut: 't',
  renderNode: TerminalNode,
  renderProperties: TerminalProperties,
  renderEditor: TerminalEditor,
  defaultData: () => ({
    type: 'terminal',
    lane: '',
    label: 'New Terminal',
    outcome: 'success',
  }),
  validate: () => [],
}
