import type { NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { NodeShell } from '../NodeShell'
import type { NodeSpec, NodePropertiesProps, NodeEditorProps } from '../types'
import { RulesRefEditor } from '../../components-v2/RulesRefEditor'
import { RulesPreview } from '../../components-v2/RulesPreview'
import type { RulesData } from '../../components-v2/DecisionTable'

interface RulesRef {
  file: string
  evaluator?: string
}

interface SwitchCase {
  when: string
  next: string
}

function SwitchNode({ id, data, selected }: NodeProps) {
  const { label, description, isUnassigned, hasError } =
    data

  return (
    <NodeShell
      nodeId={id}
      type="switch"
      label={(label as string | undefined) ?? 'Switch'}
      description={description as string | undefined}
      selected={selected}
      isUnassigned={isUnassigned as boolean | undefined}
      hasError={hasError as boolean | undefined}
      colorVar="--fp-node-purple"
      icon={GitBranch}
    />
  )
}

function SwitchProperties({ nodeId, data }: NodePropertiesProps) {
  const rules = data.rules as RulesRef | undefined
  const cases = data.cases as SwitchCase[] | undefined

  if (rules) {
    return (
      <div data-testid={`properties-${nodeId}`}>
        <span data-testid="rules-file-label">Rules: {rules.file}</span>
      </div>
    )
  }

  if (cases && cases.length > 0) {
    return (
      <div data-testid={`properties-${nodeId}`}>
        <span data-testid="cases-summary">{cases.length} case{cases.length !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  return (
    <div data-testid={`properties-${nodeId}`}>
      <span data-testid="no-routing">No routing configured</span>
    </div>
  )
}

function SwitchEditor({ nodeId, data, onChange }: NodeEditorProps) {
  const rules = data.rules as RulesRef | undefined
  const cases = data.cases as SwitchCase[] | undefined
  const rulesData = data._rulesData as RulesData | undefined
  const hasRules = rules !== undefined
  const hasCasesOrEntryPoints = cases !== undefined && cases.length > 0

  function handleRulesRefChange(ref: RulesRef | undefined) {
    const updated: Record<string, unknown> = { ...data }
    if (ref) {
      // Switching to rules mode: set rules, clear cases
      updated.rules = ref
      delete updated.cases
    } else {
      // Switching away from rules: clear rules, restore cases
      delete updated.rules
      delete updated._rulesData
      updated.cases = [{ when: '', next: '' }]
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
        alternateLabel="Cases"
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
        <div data-testid="cases-placeholder" style={{ marginTop: 12 }}>
          Cases editor placeholder
        </div>
      )}
    </div>
  )
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
