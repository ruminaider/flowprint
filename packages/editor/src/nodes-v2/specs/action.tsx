import type { NodeProps } from '@xyflow/react'
import { Zap } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'
import { RulesRefEditor } from '../../components-v2/RulesRefEditor'
import { RulesPreview } from '../../components-v2/RulesPreview'
import type { RulesData } from '../../components-v2/DecisionTable'

interface RulesRef {
  file: string
  evaluator?: string
}

function ActionNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data

  return (
    <NodeShell
      nodeId={id}
      type="action"
      label={(label as string | undefined) ?? 'Action'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-orange"
      icon={Zap}
    />
  )
}

function ActionProperties({ nodeId, data }: NodePropertiesProps) {
  const rules = data.rules as RulesRef | undefined
  const entryPoints = data.entry_points as unknown[] | undefined

  if (rules) {
    return (
      <div data-testid={`properties-${nodeId}`}>
        <span data-testid="rules-file-label">Rules: {rules.file}</span>
      </div>
    )
  }

  if (entryPoints && entryPoints.length > 0) {
    return (
      <div data-testid={`properties-${nodeId}`}>
        <span data-testid="entry-points-summary">
          {entryPoints.length} entry point{entryPoints.length !== 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  return (
    <div data-testid={`properties-${nodeId}`}>
      <span data-testid="no-configuration">No configuration</span>
    </div>
  )
}

function ActionEditor({ nodeId, data, onChange }: NodeEditorProps) {
  const rules = data.rules as RulesRef | undefined
  const entryPoints = data.entry_points as unknown[] | undefined
  const rulesData = data._rulesData as RulesData | undefined
  const hasRules = rules !== undefined
  const hasCasesOrEntryPoints =
    entryPoints !== undefined && entryPoints.length > 0

  function handleRulesRefChange(ref: RulesRef | undefined) {
    const updated: Record<string, unknown> = { ...data }
    if (ref) {
      // Switching to rules mode: set rules, remove entry_points
      updated.rules = ref
      updated.entry_points = undefined
    } else {
      // Switching away from rules: remove rules, restore entry_points
      updated.rules = undefined
      updated._rulesData = undefined
      updated.entry_points = []
    }
    onChange(updated)
  }

  return (
    <div data-testid={`editor-${nodeId}`}>
      <RulesRefEditor
        rulesRef={rules}
        onChange={handleRulesRefChange}
        hasRules={hasRules}
        hasCasesOrEntryPoints={hasCasesOrEntryPoints}
        alternateLabel="Entry Points"
      />

      {rules && (
        <div style={{ marginTop: 12 }}>
          <RulesPreview
            rulesRef={rules}
            rulesData={rulesData}
          />
        </div>
      )}

      {!hasRules && (
        <div data-testid="entry-points-placeholder" style={{ marginTop: 12 }}>
          Entry points editor placeholder
        </div>
      )}
    </div>
  )
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
