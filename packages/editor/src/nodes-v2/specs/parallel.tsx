import type { NodeProps } from '@xyflow/react'
import { Columns3 } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'

function ParallelNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data as Record<string, unknown>

  return (
    <NodeShell
      nodeId={id}
      type="parallel"
      label={(label as string) ?? 'Parallel'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-cyan"
      icon={Columns3}
    />
  )
}

function ParallelProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function ParallelEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const parallelSpec: NodeSpec = {
  type: 'parallel',
  displayName: 'Parallel',
  icon: Columns3,
  color: '--fp-node-cyan',
  shortcut: 'p',
  renderNode: ParallelNode,
  renderProperties: ParallelProperties,
  renderEditor: ParallelEditor,
  defaultData: () => ({
    type: 'parallel',
    lane: '',
    label: 'New Parallel',
    branches: [],
    join: '',
  }),
  validate: () => [],
}
