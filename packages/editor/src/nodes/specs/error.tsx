import type { NodeProps } from '@xyflow/react'
import { ShieldAlert } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function ErrorNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data

  return (
    <NodeShell
      nodeId={id}
      type="error"
      label={(label as string | undefined) ?? 'Error'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-red"
      icon={ShieldAlert}
    />
  )
}

function ErrorProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function ErrorEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const errorSpec: NodeSpec = {
  type: 'error',
  displayName: 'Error',
  icon: ShieldAlert,
  color: '--fp-node-red',
  shortcut: 'e',
  renderNode: ErrorNode,
  renderProperties: ErrorProperties,
  renderEditor: ErrorEditor,
  defaultData: () => ({
    type: 'error',
    lane: '',
    label: 'New Error',
    next: undefined,
  }),
  validate: () => [],
}
