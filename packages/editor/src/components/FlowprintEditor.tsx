import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useViewport,
} from '@xyflow/react'
import type { Node as RFNode, ReactFlowInstance } from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { topoSort, validate } from '@ruminaider/flowprint-schema'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { computeEdges, computeLaneBands, autoLayout } from '../layout'
import {
  LANE_LABEL_WIDTH,
  LANE_PADDING_LEFT,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_HORIZONTAL_GAP,
} from '../layout/constants'
import LaneBackground from './LaneBackground'
import LineOfVisibility from './LineOfVisibility'
import { ValidationBanner } from './ValidationBanner'
import { useFlowprintState } from '../hooks/useFlowprintState'
import { useConnectionHandler } from '../hooks/useConnectionHandler'
import { useDeleteHandler } from '../hooks/useDeleteHandler'
import { useAddNode } from '../hooks/useAddNode'
import { useLaneDrag } from '../hooks/useLaneDrag'
import { useLaneResize } from '../hooks/useLaneResize'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { NodePalette } from './NodePalette'
import { SwitchConditionPopover } from './SwitchConditionPopover'
import { DeleteConfirmation } from './DeleteConfirmation'
import { ErrorBoundary } from './ErrorBoundary'
import { ExportButton } from './ExportButton'
import { PropertiesPanel } from '../panels/PropertiesPanel'
import { LanePanel } from '../panels/LanePanel'
import { YamlPreviewPanel } from '../panels/YamlPreviewPanel'
import { PanelSidebar } from '../panels/PanelSidebar'
import type { SidebarTab } from '../panels/PanelSidebar'
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
 * Check whether any node in the document has a stored position.
 */
function hasStoredPositions(doc: FlowprintDocument): boolean {
  return Object.values(doc.nodes).some((node) => node.position != null)
}

/**
 * Convert document nodes to React Flow nodes using stored or auto-computed positions.
 */
function docToRFNodes(
  doc: FlowprintDocument,
  bands: import('../layout/types').LaneBand[],
): RFNode[] {
  const orderedNodes = topoSort(doc)
  const positions = hasStoredPositions(doc)
    ? null // use stored positions
    : autoLayout(doc, bands)

  const bandMap = new Map(bands.map((b) => [b.laneId, b]))

  return orderedNodes.map((on) => {
    const band = bandMap.get(on.node.lane)
    const storedPos = on.node.position
    const computedPos = positions?.get(on.id)
    const pos = storedPos ?? computedPos ?? { x: 0, y: 0 }

    return {
      id: on.id,
      type: on.node.type,
      position: pos,
      data: {
        label: on.node.label,
        nodeData: on.node,
        laneColor: band?.borderColor ?? '#94a3b8',
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }
  })
}

/**
 * Writes the current viewport zoom into a ref so that pointer event handlers
 * outside the ReactFlow provider can convert screen deltas to flow deltas.
 */
function ZoomTracker({ zoomRef }: { zoomRef: React.MutableRefObject<number> }) {
  const { zoom } = useViewport()
  zoomRef.current = zoom
  return null
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

  // --- Layout computation (split functions) ---
  const { bands, lineOfVisibilityY } = useMemo(
    () => computeLaneBands(state.doc),
    [state.doc],
  )
  const edges = useMemo(() => computeEdges(state.doc), [state.doc])

  // --- Auto-layout on first render if no positions stored ---
  const hasAutoLayouted = useRef(false)
  useEffect(() => {
    if (!hasAutoLayouted.current && !hasStoredPositions(state.doc)) {
      hasAutoLayouted.current = true
      // Defer to avoid setState-during-render warning — the commit() inside
      // batchUpdatePositions fires onChange which updates the parent component.
      queueMicrotask(() => {
        const positions = autoLayout(state.doc, bands)
        state.batchUpdatePositions(positions)
      })
    }
  }, [state, bands])

  // --- React Flow nodes state ---
  const initialRFNodes = useMemo(
    () => docToRFNodes(state.doc, bands),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.doc],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initialRFNodes)

  // Sync RF nodes when doc changes externally
  const prevDocRef = useRef(state.doc)
  useEffect(() => {
    if (state.doc !== prevDocRef.current) {
      prevDocRef.current = state.doc
      setNodes(docToRFNodes(state.doc, bands))
    }
  }, [state.doc, bands, setNodes])

  // --- Canvas dimensions ---
  const canvasDims = useMemo(() => {
    const orderedNodes = topoSort(state.doc)
    const maxOrder = Math.max(...orderedNodes.map((n) => n.order), 0)
    const columnCount = maxOrder + 1
    const width = LANE_LABEL_WIDTH + LANE_PADDING_LEFT + columnCount * (NODE_WIDTH + NODE_HORIZONTAL_GAP)
    const height = bands.reduce((sum, b) => sum + b.height, 0)
    return { width, height }
  }, [state.doc, bands])

  // --- ReactFlow instance ref (for screen-to-flow coordinate conversion) ---
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  // --- Auto-dismiss validation after node drop ---
  const justDroppedRef = useRef(false)

  const handleAfterAdd = useCallback(() => {
    justDroppedRef.current = true
  }, [])

  // --- Hooks ---
  const connectionHandler = useConnectionHandler(state, state.doc)
  const deleteHandler = useDeleteHandler(state, state.doc)
  const addNode = useAddNode(state, bands, rfInstanceRef, handleAfterAdd)
  const laneDrag = useLaneDrag(state, bands)
  const zoomRef = useRef(1)
  const laneResize = useLaneResize(state, bands, zoomRef, readOnly)

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

  // --- Tidy Layout ---
  const handleTidyLayout = useCallback(() => {
    const positions = autoLayout(state.doc, bands)
    state.batchUpdatePositions(positions)
  }, [state, bands])

  // --- Validation ---
  const validation = useMemo(() => validate(state.doc), [state.doc])
  const [dismissedForDoc, setDismissedForDoc] = useState<FlowprintDocument | null>(null)

  const validationErrors = validation.errors.filter((e) => e.severity === 'error')

  // Auto-dismiss validation banner after a node drop
  useEffect(() => {
    if (justDroppedRef.current) {
      justDroppedRef.current = false
      setDismissedForDoc(state.doc)
    }
  }, [state.doc])

  const showBanner = dismissedForDoc !== state.doc && validationErrors.length > 0

  // --- Pro options (stable reference) ---
  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  // --- Sidebar tab state ---
  const [activeTab, setActiveTab] = useState<SidebarTab | null>('properties')

  return (
    <ErrorBoundary doc={state.doc}>
      <ReactFlowProvider>
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
        <div className="fp-editor-layout">
        <div className="fp-canvas-area">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            rfInstanceRef.current = instance
          }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          onConnect={readOnly ? undefined : connectionHandler.onConnect}
          isValidConnection={connectionHandler.isValidConnection}
          onNodesDelete={readOnly ? undefined : deleteHandler.onNodesDelete}
          onEdgesDelete={readOnly ? undefined : deleteHandler.onEdgesDelete}
          onDrop={readOnly ? undefined : addNode.onDrop}
          onDragOver={readOnly ? undefined : addNode.onDragOver}
          onNodeDrag={readOnly ? undefined : laneDrag.onNodeDrag}
          onNodeDragStop={readOnly ? undefined : laneDrag.onNodeDragStop}
          onSelectionChange={
            readOnly
              ? undefined
              : ({ nodes: selNodes }) => {
                  setSelectedNodeId(selNodes.length === 1 ? (selNodes[0]?.id ?? null) : null)
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
          <ZoomTracker zoomRef={zoomRef} />
          <LaneBackground
            lanes={bands}
            totalWidth={canvasDims.width}
            highlightedLaneId={laneDrag.highlightedLaneId}
            readOnly={readOnly}
            resizeOverride={laneResize.resizeOverride}
            onResizeHandlePointerDown={laneResize.handlePointerDown}
            isResizing={laneResize.isResizing}
          />
          {lineOfVisibilityY !== null && (
            <LineOfVisibility y={lineOfVisibilityY} totalWidth={canvasDims.width} />
          )}
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--fp-bg-grid-dot)"
            />
          )}
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
        {!readOnly && <NodePalette variant="dock" />}
        {!readOnly && (
          <button
            type="button"
            className="fp-tidy-layout-btn"
            onClick={handleTidyLayout}
            title="Tidy layout"
            style={{
              position: 'absolute',
              bottom: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 6,
              padding: '6px 12px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Tidy Layout
          </button>
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
        {showExportButton && !readOnly && <ExportButton doc={state.doc} />}
        </div>
        {!readOnly && (
          <PanelSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showYamlTab={showYamlPreview}
          >
            {{
              properties: (
                <PropertiesPanel
                  selectedNodeId={selectedNodeId}
                  doc={state.doc}
                  onUpdateNode={(id, patch) => {
                    state.updateNode(id, patch)
                  }}
                  lanes={state.doc.lanes}
                  symbolSearch={symbolSearch}
                />
              ),
              lanes: (
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
              ),
              yaml: showYamlPreview ? <YamlPreviewPanel doc={state.doc} visible /> : null,
            }}
          </PanelSidebar>
        )}
        </div>
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
