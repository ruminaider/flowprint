import type { NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function SwitchNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data as Record<string, unknown>

  return (
    <NodeShell
      nodeId={id}
      type="switch"
      label={(label as string) ?? 'Switch'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-purple"
      icon={GitBranch}
    />
  )
}

function SwitchProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function SwitchEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const switchSpec: NodeSpec = {
  type: 'switch',
  displayName: 'Switch',
  icon: GitBranch,
  color: '--fp-node-purple',
  shortcut: 's',
  renderNode: SwitchNode,
  renderProperties: SwitchProperties,
  renderEditor: SwitchEditor,
  defaultData: () => ({
    type: 'switch',
    lane: '',
    label: 'New Switch',
    cases: [{ when: '', next: '' }],
  }),
  validate: () => [],
}
