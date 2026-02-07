import { useCallback } from 'react'
import type { FlowprintDocument, Node, Lane } from '@ruminaider/flowprint-schema'
import {
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isTerminalNode,
} from '@ruminaider/flowprint-schema'
import type { SymbolSearchProvider } from '../symbols/types'
import { TextField } from './fields/TextField'
import { LaneSelector } from './fields/LaneSelector'
import { EntryPointList } from './fields/EntryPointList'
import { SwitchCaseEditor } from './fields/SwitchCaseEditor'
import { ErrorHandlerEditor } from './fields/ErrorHandlerEditor'
import { WaitEventEditor } from './fields/WaitEventEditor'
import { TerminalOutcomeSelector } from './fields/TerminalOutcomeSelector'
import { InputsEditor } from './fields/InputsEditor'
import { TemporalConfigEditor } from './fields/TemporalConfigEditor'
import { CompensationEditor } from './fields/CompensationEditor'

/**
 * Props for {@link PropertiesPanel}.
 */
export interface PropertiesPanelProps {
  /** ID of the currently selected node, or `null` if nothing is selected. */
  selectedNodeId: string | null
  /** The current Flowprint document. */
  doc: FlowprintDocument
  /** Callback to apply a partial update to a node. */
  onUpdateNode: (id: string, patch: Partial<Node>) => void
  /** Map of lane IDs to lane definitions, used for the lane selector dropdown. */
  lanes: Record<string, Lane>
  /** Optional symbol search provider for entry point lookup in action nodes. */
  symbolSearch?: SymbolSearchProvider
}

/**
 * Side panel for editing the properties of a selected node.
 *
 * Displays common fields (label, lane, description) and type-specific editors
 * (entry points for actions, cases for switches, etc.). Shows a placeholder
 * message when no node is selected.
 *
 * @example
 * ```tsx
 * <PropertiesPanel
 *   selectedNodeId={selectedId}
 *   doc={doc}
 *   onUpdateNode={state.updateNode}
 *   lanes={doc.lanes}
 * />
 * ```
 */
export function PropertiesPanel({
  selectedNodeId,
  doc,
  onUpdateNode,
  lanes,
  symbolSearch,
}: PropertiesPanelProps) {
  const node = selectedNodeId ? doc.nodes[selectedNodeId] : undefined

  const handlePatch = useCallback(
    (patch: Partial<Node>) => {
      if (selectedNodeId) {
        onUpdateNode(selectedNodeId, patch)
      }
    },
    [selectedNodeId, onUpdateNode],
  )

  if (!selectedNodeId || !node) {
    return (
      <div className="fp-panel">
        <div className="fp-panel-placeholder">Select a node to edit</div>
      </div>
    )
  }

  return (
    <div className="fp-panel">
      <div className="fp-panel-header">
        <span className="fp-panel-header-type">{node.type}</span>
        <span className="fp-panel-header-id">{selectedNodeId}</span>
      </div>

      {/* Common fields */}
      <TextField
        label="Label"
        value={node.label}
        onChange={(label) => {
          handlePatch({ label } as Partial<Node>)
        }}
      />
      <LaneSelector
        value={node.lane}
        lanes={lanes}
        onChange={(lane) => {
          handlePatch({ lane } as Partial<Node>)
        }}
      />
      {!isTerminalNode(node) && (
        <TextField
          label="Description"
          value={node.description ?? ''}
          onChange={(description) => {
            handlePatch({ description: description || undefined } as Partial<Node>)
          }}
        />
      )}

      {/* Type-specific fields */}
      {isActionNode(node) && (
        <div className="fp-panel-section">
          <EntryPointList
            entries={node.entry_points ?? []}
            onChange={(entry_points) => {
              handlePatch({ entry_points } as Partial<Node>)
            }}
            symbolSearch={symbolSearch}
          />
          <ErrorHandlerEditor
            error={node.error}
            onChange={(error) => {
              handlePatch({ error } as Partial<Node>)
            }}
          />
          <InputsEditor
            inputs={node.inputs}
            onChange={(inputs) => {
              handlePatch({ inputs } as Partial<Node>)
            }}
          />
          <TemporalConfigEditor
            config={node.temporal}
            onChange={(temporal) => {
              handlePatch({ temporal } as Partial<Node>)
            }}
          />
          <CompensationEditor
            compensation={node.compensation}
            onChange={(compensation) => {
              handlePatch({ compensation } as Partial<Node>)
            }}
          />
        </div>
      )}

      {isSwitchNode(node) && (
        <div className="fp-panel-section">
          <SwitchCaseEditor
            cases={[...node.cases]}
            onChange={(cases) => {
              handlePatch({
                cases: cases as [
                  { when: string; next: string },
                  ...{ when: string; next: string }[],
                ],
              } as Partial<Node>)
            }}
          />
        </div>
      )}

      {isParallelNode(node) && (
        <div className="fp-panel-section">
          <div className="fp-panel-field">
            <label className="fp-panel-field-label">Join Strategy</label>
            <select
              className="fp-panel-field-select"
              value={node.join_strategy ?? 'all_reached'}
              onChange={(e) => {
                handlePatch({
                  join_strategy: e.target.value as 'all_reached' | 'await_all' | 'all' | 'first',
                } as Partial<Node>)
              }}
              aria-label="Join Strategy"
            >
              <option value="all">All</option>
              <option value="first">First</option>
              <option value="all_reached">All Reached</option>
              <option value="await_all">Await All</option>
            </select>
          </div>
        </div>
      )}

      {isWaitNode(node) && (
        <div className="fp-panel-section">
          <WaitEventEditor
            event={node.event}
            timeout={node.timeout}
            event_type={node.event_type}
            event_type_import={node.event_type_import}
            timeout_next={node.timeout_next}
            onChange={(patch) => {
              handlePatch(patch as Partial<Node>)
            }}
          />
        </div>
      )}

      {isTerminalNode(node) && (
        <div className="fp-panel-section">
          <TerminalOutcomeSelector
            outcome={node.outcome}
            onChange={(outcome) => {
              handlePatch({ outcome } as Partial<Node>)
            }}
          />
        </div>
      )}
    </div>
  )
}
