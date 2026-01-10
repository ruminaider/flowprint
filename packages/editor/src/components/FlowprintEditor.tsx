import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react'
import type { FlowprintDocument, ValidationResult } from '@ruminaider/flowprint-schema'
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
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { LanePanel } from '../panels/LanePanel'

export interface FlowprintEditorProps {
  value: FlowprintDocument
  onChange: (doc: FlowprintDocument) => void
  className?: string
  style?: React.CSSProperties
  showMinimap?: boolean
  showGrid?: boolean
  readOnly?: boolean
}

export function FlowprintEditor({
  value,
  onChange,
  className,
  style,
  showMinimap = true,
  showGrid = true,
  readOnly = false,
}: FlowprintEditorProps) {
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
    undo: state.undo,
    redo: state.redo,
    deleteSelected: () => {
      if (selectedNodeId) {
        const node = state.doc.nodes[selectedNodeId]
        if (node) {
          deleteHandler.onNodesDelete([{ id: selectedNodeId } as import('@xyflow/react').Node])
        }
      }
    },
    selectAll: () => {}, // no-op for now
    deselect: () => setSelectedNodeId(null),
    disabled: readOnly,
  })

  // --- Validation ---
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validate(state.doc),
  )
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    const result = validate(state.doc)
    setValidation(result)
    setBannerDismissed(false)
  }, [state.doc])

  const validationErrors = validation.errors.filter((e) => e.severity === 'error')
  const showBanner = !bannerDismissed && validationErrors.length > 0

  // --- Pro options (stable reference) ---
  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <ErrorBoundary doc={state.doc}>
    <div
      className={`fp-editor ${className ?? ''}`}
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
        onSelectionChange={readOnly ? undefined : ({ nodes }) => {
          setSelectedNodeId(nodes.length === 1 ? nodes[0]?.id ?? null : null)
        }}
        onNodeClick={readOnly ? undefined : (_, node) => setSelectedNodeId(node.id)}
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
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      {!readOnly && <NodePalette />}
      {!readOnly && (
        <PropertiesPanel
          selectedNodeId={selectedNodeId}
          doc={state.doc}
          onUpdateNode={state.updateNode}
          lanes={state.doc.lanes}
        />
      )}
      {!readOnly && (
        <LanePanel
          doc={state.doc}
          onAddLane={state.addLane}
          onUpdateLane={state.updateLane}
          onRemoveLane={state.removeLane}
          onReorderLanes={state.reorderLanes}
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
    </div>
    </ErrorBoundary>
  )
}
