import { useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  type ReactFlowProps,
} from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { nodeTypes } from '../nodes-v2/specs'
import { edgeTypes } from '../edges-v2'
import { computeLayout } from '../layout'
import { LaneBackground } from '../components-v2/LaneBackground'
import type { LaneBackgroundLane } from '../components-v2/LaneBackground'

/**
 * Props for {@link FlowprintViewer}.
 */
export interface FlowprintViewerProps {
  /** The Flowprint document to render. */
  document: FlowprintDocument
  /** Additional CSS class name applied to the viewer root `div`. */
  className?: string
  /** Inline styles applied to the viewer root `div`. */
  style?: React.CSSProperties
  /** Show the navigation minimap overlay. Defaults to `true`. */
  showMinimap?: boolean
  /** Show background grid dots. Defaults to `true`. */
  showGrid?: boolean
}

/**
 * Read-only Flowprint service blueprint viewer.
 *
 * A lightweight alternative to {@link FlowprintEditor} that renders a blueprint
 * without any editing infrastructure (no palette, panels, or connection handlers).
 * Supports pan, zoom, and minimap navigation.
 *
 * @example
 * ```tsx
 * <FlowprintViewer document={doc} showMinimap />
 * ```
 */
export function FlowprintViewer({
  document: doc,
  className,
  style,
  showMinimap = true,
  showGrid = true,
}: FlowprintViewerProps) {
  const layout = useMemo(() => computeLayout(doc), [doc])

  const v2Lanes: LaneBackgroundLane[] = useMemo(() => {
    const laneList = layout.lanes
    return laneList.map((lane, idx) => ({
      id: lane.laneId,
      label: lane.label,
      color: lane.color,
      y: lane.y,
      height: lane.height,
      collapsed: false,
      lineOfVisibilityBelow:
        layout.lineOfVisibilityY !== null &&
        idx < laneList.length - 1 &&
        lane.y + lane.height <= layout.lineOfVisibilityY &&
        (laneList[idx + 1]?.y ?? 0) >= layout.lineOfVisibilityY,
    }))
  }, [layout])

  const emptySet = useMemo(() => new Set<string>(), [])
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = useMemo(() => () => {}, [])

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), [])

  const proOptions: ReactFlowProps['proOptions'] = useMemo(() => ({ hideAttribution: true }), [])

  return (
    <ReactFlowProvider>
      <div
        className={`fp-viewer ${className ?? ''}`}
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
        defaultViewport={defaultViewport}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.1 }}
        snapToGrid
        snapGrid={[20, 20]}
        proOptions={proOptions}
      >
        <LaneBackground
          lanes={v2Lanes}
          totalWidth={layout.width}
          collapsedLaneIds={emptySet}
          onToggleCollapse={noop}
          onRename={noop}
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
      </div>
    </ReactFlowProvider>
  )
}
