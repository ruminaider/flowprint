import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
} from '@xyflow/react'
import type { Node as RFNode, ReactFlowInstance } from '@xyflow/react'
import type { FlowprintDocument, Node } from '@ruminaider/flowprint-schema'
import { topoSort, validate, serialize } from '@ruminaider/flowprint-schema'

// V2 node + edge types (importing registers specs as side effect)
import { nodeTypes } from '../nodes-v2/specs'
import { edgeTypes } from '../edges-v2'
import { getAllNodeSpecs, getNodeSpec } from '../nodes-v2/registry'

// Layout utilities (preserved)
import { computeEdges, computeLaneBands, autoLayout } from '../layout'
import {
  LANE_LABEL_WIDTH,
  LANE_PADDING_LEFT,
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_HORIZONTAL_GAP,
} from '../layout/constants'
import { snapToLane } from '../hooks/useLaneSnap'

// V2 components
import { TabBar } from '../components-v2/TabBar'
import { Toolbar } from '../components-v2/Toolbar'
import { NodePopover } from '../components-v2/NodePopover'
import { CommandPalette } from '../components-v2/CommandPalette'
import type { Command } from '../components-v2/CommandPaletteItem'
import { ZoomControls } from '../components-v2/ZoomControls'
import { BottomPanel } from '../components-v2/BottomPanel'
import { LaneBackground as LaneBackgroundV2 } from '../components-v2/LaneBackground'

// V2 hooks
import { useTabState } from '../hooks-v2/useTabState'
import { useLaneCollapse } from '../hooks-v2/useLaneCollapse'
import { useLaneReorder } from '../hooks-v2/useLaneReorder'
import { useKeyboardShortcuts } from '../hooks-v2/useKeyboardShortcuts'

// Preserved hooks
import { useFlowprintState } from '../hooks/useFlowprintState'
import { useConnectionHandler } from '../hooks/useConnectionHandler'
import { useDeleteHandler } from '../hooks/useDeleteHandler'
import { useAddNode } from '../hooks/useAddNode'
import { useLaneDrag } from '../hooks/useLaneDrag'
import { useTheme } from '../hooks/useTheme'

// Preserved old components (still needed for dialogs)
import { SwitchConditionPopover } from './SwitchConditionPopover'
import { DeleteConfirmation } from './DeleteConfirmation'
import { ErrorBoundary } from './ErrorBoundary'

import type { ThemeMode } from '../hooks/useTheme'
import type { SymbolSearchProvider } from '../symbols/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlowprintEditorProps {
  value: FlowprintDocument
  onChange: (doc: FlowprintDocument) => void
  className?: string
  style?: React.CSSProperties
  showMinimap?: boolean
  showGrid?: boolean
  readOnly?: boolean
  theme?: ThemeMode
  symbolSearch?: SymbolSearchProvider
  showYamlPreview?: boolean
  showExportButton?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasStoredPositions(doc: FlowprintDocument): boolean {
  return Object.values(doc.nodes).some((node) => node.position != null)
}

function docToRFNodes(
  doc: FlowprintDocument,
  bands: import('../layout/types').LaneBand[],
): RFNode[] {
  const orderedNodes = topoSort(doc)
  const positions = hasStoredPositions(doc)
    ? null
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

function createDefaultNode(type: string, lane: string): Node | null {
  switch (type) {
    case 'action':
      return { type: 'action', lane, label: 'New Action' }
    case 'switch':
      return { type: 'switch', lane, label: 'New Switch', cases: [] } as Node
    case 'parallel':
      return { type: 'parallel', lane, label: 'New Parallel', branches: [], join: '' } as Node
    case 'wait':
      return { type: 'wait', lane, label: 'New Wait', event: 'event_name' }
    case 'error':
      return { type: 'error', lane, label: 'New Error' }
    case 'terminal':
      return { type: 'terminal', lane, label: 'New Terminal', outcome: 'success' }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Node tab content (placeholder for full editor)
// ---------------------------------------------------------------------------

function NodeTabContent({
  nodeId,
  doc,
  onUpdate,
  lanes,
}: {
  nodeId: string
  doc: FlowprintDocument
  onUpdate: (id: string, patch: Partial<Node>) => void
  lanes: Array<{ id: string; label: string }>
}) {
  const node = doc.nodes[nodeId]
  if (!node) {
    return <div className="fp-editor__tab-empty">Node not found</div>
  }

  const spec = getNodeSpec(node.type)
  const EditorComponent = spec?.renderEditor ?? spec?.renderProperties

  if (!EditorComponent) {
    return (
      <div className="fp-editor__tab-empty">
        No editor available for {node.type} nodes
      </div>
    )
  }

  return (
    <div className="fp-editor__node-editor">
      <EditorComponent
        nodeId={nodeId}
        data={node as unknown as Record<string, unknown>}
        lanes={lanes}
        onChange={(data: Record<string, unknown>) => {
          onUpdate(nodeId, data as unknown as Partial<Node>)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PopoverInfo {
  nodeId: string
  x: number
  y: number
  width: number
  height: number
  containerWidth: number
  containerHeight: number
}

export function FlowprintEditor({
  value,
  onChange,
  className,
  style,
  showMinimap = true,
  showGrid = true,
  readOnly = false,
  theme = 'system',
}: FlowprintEditorProps) {
  const resolvedTheme = useTheme(theme)
  const state = useFlowprintState({ initialDoc: value, onChange })
  const canvasRef = useRef<HTMLDivElement>(null)

  // --- External value sync ---
  const prevValueRef = useRef(value)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value
      state.setDoc(value)
    }
  }, [value, state])

  // --- Layout computation ---
  const { bands, lineOfVisibilityY } = useMemo(
    () => computeLaneBands(state.doc),
    [state.doc],
  )
  const edges = useMemo(() => computeEdges(state.doc), [state.doc])

  // --- Auto-layout on first render ---
  const hasAutoLayouted = useRef(false)
  useEffect(() => {
    if (!hasAutoLayouted.current && !hasStoredPositions(state.doc)) {
      hasAutoLayouted.current = true
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

  // --- ReactFlow instance ref ---
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)

  // --- Auto-dismiss validation after node drop ---
  const justDroppedRef = useRef(false)
  const handleAfterAdd = useCallback(() => {
    justDroppedRef.current = true
  }, [])

  // --- Preserved hooks ---
  const connectionHandler = useConnectionHandler(state, state.doc)
  const deleteHandler = useDeleteHandler(state, state.doc)
  const addNode = useAddNode(state, bands, rfInstanceRef, handleAfterAdd)
  const laneDrag = useLaneDrag(state, bands)

  // --- V2 hooks ---
  const tabState = useTabState()
  const laneCollapse = useLaneCollapse()

  const orderedLaneIds = useMemo(
    () => bands.map((b) => b.laneId),
    [bands],
  )
  const laneReorderHook = useLaneReorder(orderedLaneIds, state.reorderLanes)

  // --- UI state ---
  const [activeTool, setActiveTool] = useState('select')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [popoverInfo, setPopoverInfo] = useState<PopoverInfo | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false)

  // --- Pro options (stable reference) ---
  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  // --- Lane data for v2 components ---
  const v2Lanes = useMemo(
    () =>
      bands.map((band) => ({
        id: band.laneId,
        label: band.label,
        color: band.borderColor,
        y: band.y,
        height: band.height,
        collapsed: laneCollapse.isCollapsed(band.laneId),
        lineOfVisibilityBelow:
          lineOfVisibilityY !== null &&
          Math.abs(band.y + band.height - lineOfVisibilityY) < 1,
      })),
    [bands, laneCollapse, lineOfVisibilityY],
  )

  const laneOptions = useMemo(
    () => bands.map((b) => ({ id: b.laneId, label: b.label })),
    [bands],
  )

  // --- Tidy Layout ---
  const handleTidyLayout = useCallback(() => {
    const positions = autoLayout(state.doc, bands)
    state.batchUpdatePositions(positions)
  }, [state, bands])

  // --- Add node from toolbar ---
  const handleAddNodeFromToolbar = useCallback(
    (type: string) => {
      const rfInstance = rfInstanceRef.current
      const container = canvasRef.current
      if (!rfInstance || !container) return

      const { width, height } = container.getBoundingClientRect()
      const centerFlow = rfInstance.screenToFlowPosition({
        x: width / 2,
        y: height / 2,
      })

      const snap = snapToLane(centerFlow.y + NODE_HEIGHT / 2, bands)
      const lane = snap?.laneId ?? (bands[0]?.laneId ?? '')
      const id = `new_${type}_${Date.now()}`

      const node = createDefaultNode(type, lane)
      if (!node) return

      ;(node as { position?: { x: number; y: number } }).position = {
        x: centerFlow.x - NODE_WIDTH / 2,
        y: centerFlow.y - NODE_HEIGHT / 2,
      }

      state.addNode(id, node)
    },
    [state, bands],
  )

  // --- Node click → popover ---
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      setSelectedNodeId(node.id)
      const rfInstance = rfInstanceRef.current
      const container = canvasRef.current
      if (!rfInstance || !container) return

      const screenPos = rfInstance.flowToScreenPosition(node.position)
      const rect = container.getBoundingClientRect()
      const zoom = rfInstance.getZoom()

      setPopoverInfo({
        nodeId: node.id,
        x: screenPos.x - rect.left,
        y: screenPos.y - rect.top,
        width: NODE_WIDTH * zoom,
        height: NODE_HEIGHT * zoom,
        containerWidth: rect.width,
        containerHeight: rect.height,
      })
    },
    [],
  )

  // --- Node double-click → open tab ---
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      const docNode = state.doc.nodes[node.id]
      if (docNode) {
        tabState.openTab(node.id, docNode.type, docNode.label)
        setPopoverInfo(null)
      }
    },
    [state.doc.nodes, tabState],
  )

  // --- Pane click → deselect ---
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setPopoverInfo(null)
  }, [])

  // --- Selection change ---
  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }: { nodes: RFNode[] }) => {
      setSelectedNodeId(selNodes.length === 1 ? (selNodes[0]?.id ?? null) : null)
    },
    [],
  )

  // --- Lane callbacks ---
  const handleLaneRename = useCallback(
    (laneId: string, newName: string) => {
      state.updateLane(laneId, { label: newName })
    },
    [state],
  )

  const handleLaneDrop = useCallback(
    (e: React.DragEvent) => {
      const target = (e.currentTarget as HTMLElement).closest('[data-lane-id]')
      const targetId = target?.getAttribute('data-lane-id')
      if (targetId) {
        laneReorderHook.onDrop(e, targetId)
      }
    },
    [laneReorderHook],
  )

  // --- Popover callbacks ---
  const handlePopoverChange = useCallback(
    (data: Record<string, unknown>) => {
      if (popoverInfo) {
        state.updateNode(popoverInfo.nodeId, data as unknown as Partial<Node>)
      }
    },
    [state, popoverInfo],
  )

  const handleOpenEditor = useCallback(
    (nodeId: string) => {
      const docNode = state.doc.nodes[nodeId]
      if (docNode) {
        tabState.openTab(nodeId, docNode.type, docNode.label)
        setPopoverInfo(null)
      }
    },
    [state.doc.nodes, tabState],
  )

  const handlePopoverClose = useCallback(() => {
    setPopoverInfo(null)
  }, [])

  // --- YAML + Validation for BottomPanel ---
  const yamlContent = useMemo(() => {
    try {
      return serialize(state.doc)
    } catch {
      return '# Serialization error'
    }
  }, [state.doc])

  const validation = useMemo(() => validate(state.doc), [state.doc])
  const validationErrors = useMemo(
    () =>
      validation.errors
        .filter((e) => e.severity === 'error')
        .map((e) => ({ message: e.message, path: e.path })),
    [validation],
  )

  // --- Command palette commands ---
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = []
    const nodeSpecs = getAllNodeSpecs()

    for (const spec of nodeSpecs) {
      cmds.push({
        id: `add-${spec.type}`,
        label: `Add ${spec.displayName}`,
        category: 'Nodes',
        shortcut: spec.shortcut,
        icon: spec.icon,
        action: () => {
          handleAddNodeFromToolbar(spec.type)
        },
      })
    }

    cmds.push(
      { id: 'undo', label: 'Undo', category: 'Edit', shortcut: '⌘Z', action: () => { state.undo() } },
      { id: 'redo', label: 'Redo', category: 'Edit', shortcut: '⌘⇧Z', action: () => { state.redo() } },
      { id: 'tidy-layout', label: 'Tidy Layout', category: 'View', action: handleTidyLayout },
      {
        id: 'toggle-bottom-panel',
        label: 'Toggle Bottom Panel',
        category: 'View',
        shortcut: '⌘J',
        action: () => { setBottomPanelOpen((prev) => !prev) },
      },
    )

    return cmds
  }, [handleAddNodeFromToolbar, state, handleTidyLayout])

  // --- V2 keyboard shortcuts ---
  useKeyboardShortcuts({
    shortcuts: {
      'mod+z': { handler: () => { state.undo() } },
      'mod+shift+z': { handler: () => { state.redo() } },
      'mod+k': { handler: () => { setCommandPaletteOpen(true) } },
      'mod+j': { handler: () => { setBottomPanelOpen((prev) => !prev) } },
      'v': { handler: () => { setActiveTool('select') } },
      'h': { handler: () => { setActiveTool('hand') } },
      'delete': {
        handler: () => {
          if (selectedNodeId) {
            deleteHandler.onNodesDelete([{ id: selectedNodeId } as RFNode])
          }
        },
        when: () => selectedNodeId !== null,
      },
      'backspace': {
        handler: () => {
          if (selectedNodeId) {
            deleteHandler.onNodesDelete([{ id: selectedNodeId } as RFNode])
          }
        },
        when: () => selectedNodeId !== null,
      },
      'escape': {
        handler: () => {
          setSelectedNodeId(null)
          setPopoverInfo(null)
          setCommandPaletteOpen(false)
        },
      },
    },
    disabled: readOnly,
  })

  // --- Render ---
  const showCanvas = tabState.activeTabId === 'graph'

  return (
    <ErrorBoundary doc={state.doc}>
      <ReactFlowProvider>
        <div
          className={`fp-editor${className ? ` ${className}` : ''}`}
          data-fp-theme={resolvedTheme}
          style={style}
        >
          <TabBar
            tabs={tabState.tabs}
            activeTabId={tabState.activeTabId}
            onTabSelect={tabState.setActiveTab}
            onTabClose={tabState.closeTab}
            onTabCloseAll={tabState.closeAllTabs}
            onTabCloseOthers={tabState.closeOtherTabs}
          />

          <div className="fp-editor__main">
            <div
              className="fp-editor__canvas"
              ref={canvasRef}
              style={{ display: showCanvas ? undefined : 'none' }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={(instance) => {
                  rfInstanceRef.current = instance
                }}
                nodesDraggable={!readOnly && activeTool !== 'hand'}
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
                onSelectionChange={readOnly ? undefined : handleSelectionChange}
                onNodeClick={readOnly ? undefined : handleNodeClick}
                onNodeDoubleClick={readOnly ? undefined : handleNodeDoubleClick}
                onPaneClick={handlePaneClick}
                panOnDrag={activeTool === 'hand' ? [0, 1, 2] : [1, 2]}
                zoomOnScroll
                zoomOnPinch
                fitView
                fitViewOptions={{ padding: 0.1 }}
                snapToGrid
                snapGrid={[20, 20]}
                proOptions={proOptions}
              >
                <LaneBackgroundV2
                  lanes={v2Lanes}
                  totalWidth={canvasDims.width}
                  collapsedLaneIds={laneCollapse.collapsedIds}
                  onToggleCollapse={laneCollapse.toggleCollapse}
                  onRename={handleLaneRename}
                  onDragStart={laneReorderHook.onDragStart}
                  onDragOver={laneReorderHook.onDragOver}
                  onDrop={handleLaneDrop}
                />
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

              {popoverInfo && !readOnly && (
                <NodePopover
                  nodeId={popoverInfo.nodeId}
                  nodeType={state.doc.nodes[popoverInfo.nodeId]?.type ?? 'action'}
                  nodeData={(state.doc.nodes[popoverInfo.nodeId] ?? {}) as Record<string, unknown>}
                  nodePosition={{ x: popoverInfo.x, y: popoverInfo.y }}
                  nodeWidth={popoverInfo.width}
                  nodeHeight={popoverInfo.height}
                  lanes={laneOptions}
                  viewportWidth={popoverInfo.containerWidth}
                  viewportHeight={popoverInfo.containerHeight}
                  onChange={handlePopoverChange}
                  onOpenEditor={handleOpenEditor}
                  onClose={handlePopoverClose}
                />
              )}

              {!readOnly && (
                <Toolbar
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                  onAddNode={handleAddNodeFromToolbar}
                  onCommandPalette={() => { setCommandPaletteOpen(true) }}
                  onTidyLayout={handleTidyLayout}
                />
              )}

              <ZoomControls />
            </div>

            {!showCanvas && (
              <div className="fp-editor__tab-content">
                <NodeTabContent
                  nodeId={tabState.activeTabId}
                  doc={state.doc}
                  onUpdate={state.updateNode}
                  lanes={laneOptions}
                />
              </div>
            )}
          </div>

          <BottomPanel
            isOpen={bottomPanelOpen}
            onClose={() => { setBottomPanelOpen(false) }}
            yamlContent={yamlContent}
            validationErrors={validationErrors}
          />

          <CommandPalette
            commands={commands}
            isOpen={commandPaletteOpen}
            onClose={() => { setCommandPaletteOpen(false) }}
          />

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
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}
