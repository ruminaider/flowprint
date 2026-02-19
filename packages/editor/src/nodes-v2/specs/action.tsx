import type { NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function ActionNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data as Record<string, unknown>

  return (
    <NodeShell
      nodeId={id}
      type="action"
      label={(label as string) ?? 'Action'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-orange"
      icon={Zap}
    />
  )
}

function ActionProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function ActionEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const actionSpec: NodeSpec = {
  type: 'action',
  displayName: 'Action',
  icon: Zap,
  color: '--fp-node-orange',
  shortcut: 'a',
  renderNode: ActionNode,
  renderProperties: ActionProperties,
  renderEditor: ActionEditor,
  defaultData: () => ({
    type: 'action',
    lane: '',
    label: 'New Action',
    next: undefined,
    entry_points: [],
  }),
  validate: () => [],
}
