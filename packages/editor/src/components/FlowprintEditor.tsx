import { useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, BackgroundVariant, MiniMap } from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validate } from '@ruminaider/flowprint-schema'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { computeLayout } from '../layout'
import LaneBackground from './LaneBackground'
import LineOfVisibility from './LineOfVisibility'
import { ValidationBanner } from './ValidationBanner'
import { useFlowprintState } from '../hooks/useFlowprintState'
import { useConnectionHandler } from '../hooks/useConnectionHandler'
import { useDeleteHandler } from '../hooks/useDeleteHandler'
import { useAddNode } from '../hooks/useAddNode'
import { useLaneSnap } from '../hooks/useLaneSnap'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { NodePalette } from './NodePalette'
import { SwitchConditionPopover } from './SwitchConditionPopover'
import { DeleteConfirmation } from './DeleteConfirmation'
import { ErrorBoundary } from './ErrorBoundary'
import { ExportButton } from './ExportButton'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { LanePanel } from '../panels/LanePanel'
import { YamlPreviewPanel } from '../panels/YamlPreviewPanel'
import { useTheme } from '../hooks/useTheme'
import type { SymbolSearchProvider } from '../symbols/types'
import type { ThemeMode } from '../hooks/useTheme'

/**
 * Props for {@link FlowprintEditor}.
 */
export interface FlowprintEditorProps {
  /** The Flowprint document to edit. The editor operates as a controlled component. */
  value: FlowprintDocument
  /** Callback fired whenever the document is mutated (node add/remove/update, connections, lanes). */
  onChange: (doc: FlowprintDocument) => void
  /** Additional CSS class name applied to the editor root `div`. */
  className?: string
  /** Inline styles applied to the editor root `div`. */
  style?: React.CSSProperties
  /** Show the navigation minimap overlay. Defaults to `true`. */
  showMinimap?: boolean
  /** Show background grid dots. Defaults to `true`. */
  showGrid?: boolean
  /** Disable all editing interactions (palette, panels, connections, drag). Defaults to `false`. */
  readOnly?: boolean
  /** Color theme mode. Defaults to `'system'` (follows OS preference). */
  theme?: ThemeMode
  /** Symbol search provider for entry point lookup in action nodes. */
  symbolSearch?: SymbolSearchProvider
  /** Show the YAML preview panel. Defaults to `false`. */
  showYamlPreview?: boolean
  /** Show the SVG export button. Hidden in read-only mode. Defaults to `false`. */
  showExportButton?: boolean
}

/**
 * Embeddable Flowprint service blueprint editor.
 *
 * A controlled React component that renders a visual editor for `.flowprint.yaml`
 * service blueprints. Supports theming, symbol search, YAML preview, and SVG export.
 *
 * The editor container fills 100% of its parent's width and height. Make sure the
 * parent element has explicit dimensions.
 *
 * @example
 * ```tsx
 * <FlowprintEditor value={doc} onChange={setDoc} theme="dark" />
 * ```
 */
export function FlowprintEditor({
  value,
  onChange,
  className,
  style,
  showMinimap = true,
  showGrid = true,
  readOnly = false,
  theme = 'system',
  symbolSearch,
  showYamlPreview = false,
  showExportButton = false,
}: FlowprintEditorProps) {
  const resolvedTheme = useTheme(theme)
  const state = useFlowprintState({ initialDoc: value, onChange })

  // --- External value sync ---
  // Track the previous value prop to detect external changes.
  const prevValueRef = useRef(value)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      state.setDoc(value)
    }
  }, [value, state])

  // --- Layout ---
  const layout = useMemo(() => computeLayout(state.doc), [state.doc])

  // --- Hooks ---
  const connectionHandler = useConnectionHandler(state, state.doc)
  const deleteHandler = useDeleteHandler(state, state.doc)
  const addNode = useAddNode(state, layout.lanes)
  const laneSnap = useLaneSnap(layout.lanes)

  // --- Selection ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // --- Keyboard shortcuts ---
  useKeyboardShortcuts({
    undo: () => {
      state.undo()
    },
    redo: () => {
      state.redo()
    },
    deleteSelected: () => {
      if (selectedNodeId) {
        const node = state.doc.nodes[selectedNodeId]
        if (node) {
          deleteHandler.onNodesDelete([{ id: selectedNodeId } as import('@xyflow/react').Node])
        }
      }
    },
    selectAll: () => {
      /* noop */
    },
    deselect: () => {
      setSelectedNodeId(null)
    },
    disabled: readOnly,
  })

  // --- Validation ---
  const validation = useMemo(() => validate(state.doc), [state.doc])
  const [dismissedForDoc, setDismissedForDoc] = useState<FlowprintDocument | null>(null)

  const validationErrors = validation.errors.filter((e) => e.severity === 'error')
  const showBanner = dismissedForDoc !== state.doc && validationErrors.length > 0

  // --- Pro options (stable reference) ---
  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <ErrorBoundary doc={state.doc}>
      <div
        className={`fp-editor ${className ?? ''}`}
        data-fp-theme={resolvedTheme}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
      >
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          onConnect={readOnly ? undefined : connectionHandler.onConnect}
          isValidConnection={connectionHandler.isValidConnection}
          onNodesDelete={readOnly ? undefined : deleteHandler.onNodesDelete}
          onEdgesDelete={readOnly ? undefined : deleteHandler.onEdgesDelete}
          onDrop={readOnly ? undefined : addNode.onDrop}
          onDragOver={readOnly ? undefined : addNode.onDragOver}
          onNodeDragStop={readOnly ? undefined : laneSnap.onNodeDragStop}
          onSelectionChange={
            readOnly
              ? undefined
              : ({ nodes }) => {
                  setSelectedNodeId(nodes.length === 1 ? (nodes[0]?.id ?? null) : null)
                }
          }
          onNodeClick={
            readOnly
              ? undefined
              : (_, node) => {
                  setSelectedNodeId(node.id)
                }
          }
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          fitView
          fitViewOptions={{ padding: 0.1 }}
          snapToGrid
          snapGrid={[20, 20]}
          proOptions={proOptions}
        >
          <LaneBackground lanes={layout.lanes} totalWidth={layout.width} />
          {layout.lineOfVisibilityY !== null && (
            <LineOfVisibility y={layout.lineOfVisibilityY} totalWidth={layout.width} />
          )}
          {showGrid && <Background variant={BackgroundVariant.Dots} gap={20} size={1} />}
          {showMinimap && <MiniMap pannable zoomable />}
        </ReactFlow>
        {showBanner && (
          <ValidationBanner
            errors={validationErrors}
            onDismiss={() => {
              setDismissedForDoc(state.doc)
            }}
          />
        )}
        {!readOnly && <NodePalette />}
        {!readOnly && (
          <PropertiesPanel
            selectedNodeId={selectedNodeId}
            doc={state.doc}
            onUpdateNode={(id, patch) => {
              state.updateNode(id, patch)
            }}
            lanes={state.doc.lanes}
            symbolSearch={symbolSearch}
          />
        )}
        {!readOnly && (
          <LanePanel
            doc={state.doc}
            onAddLane={(id, lane) => {
              state.addLane(id, lane)
            }}
            onUpdateLane={(id, patch) => {
              state.updateLane(id, patch)
            }}
            onRemoveLane={(id) => {
              state.removeLane(id)
            }}
            onReorderLanes={(ids) => {
              state.reorderLanes(ids)
            }}
          />
        )}
        {connectionHandler.pendingSwitchConnection && (
          <SwitchConditionPopover
            connection={connectionHandler.pendingSwitchConnection}
            onConfirm={connectionHandler.confirmSwitchConnection}
            onCancel={connectionHandler.cancelSwitchConnection}
          />
        )}
        {deleteHandler.pendingDeletion && (
          <DeleteConfirmation
            nodeId={deleteHandler.pendingDeletion.id}
            connectionCount={deleteHandler.pendingDeletion.connectionCount}
            onConfirm={deleteHandler.confirmDeletion}
            onCancel={deleteHandler.cancelDeletion}
          />
        )}
        {showYamlPreview && <YamlPreviewPanel doc={state.doc} visible />}
        {showExportButton && !readOnly && <ExportButton doc={state.doc} />}
      </div>
    </ErrorBoundary>
  )
}
