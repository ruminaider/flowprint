import type { NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function WaitNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data

  return (
    <NodeShell
      nodeId={id}
      type="wait"
      label={(label as string | undefined) ?? 'Wait'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-yellow"
      icon={Clock}
    />
  )
}

function WaitProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function WaitEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const waitSpec: NodeSpec = {
  type: 'wait',
  displayName: 'Wait',
  icon: Clock,
  color: '--fp-node-yellow',
  shortcut: 'w',
  renderNode: WaitNode,
  renderProperties: WaitProperties,
  renderEditor: WaitEditor,
  defaultData: () => ({
    type: 'wait',
    lane: '',
    label: 'New Wait',
    event: 'timer',
    duration: '1h',
  }),
  validate: () => [],
}
