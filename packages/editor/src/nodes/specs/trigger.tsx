import type { NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'
import type { DataClass } from '../../components/DataClassBadges'

function TriggerNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } = data

  return (
    <NodeShell
      nodeId={id}
      type="trigger"
      label={(label as string | undefined) ?? 'Trigger'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-blue"
      icon={Zap}
      dataClass={data.data_class as DataClass[] | undefined}
      laneDataClass={data._laneDataClass as DataClass[] | undefined}
    />
  )
}

function TriggerProperties({ nodeId }: NodePropertiesProps) {
  return <div data-testid={`properties-${nodeId}`}>Properties</div>
}

function TriggerEditor({ nodeId }: NodeEditorProps) {
  return <div data-testid={`editor-${nodeId}`}>Editor</div>
}

export const triggerSpec: NodeSpec = {
  type: 'trigger',
  displayName: 'Trigger',
  icon: Zap,
  color: '--fp-node-blue',
  shortcut: 'r',
  renderNode: TriggerNode,
  renderProperties: TriggerProperties,
  renderEditor: TriggerEditor,
  defaultData: () => ({
    type: 'trigger',
    lane: '',
    label: 'New Trigger',
    trigger_type: 'manual',
    next: undefined,
  }),
  validate: () => [],
}
