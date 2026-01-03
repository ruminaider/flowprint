import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  type ReactFlowProps,
} from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { computeLayout } from '../layout'
import LaneBackground from './LaneBackground'
import LineOfVisibility from './LineOfVisibility'

export interface FlowprintViewerProps {
  document: FlowprintDocument
  className?: string
  style?: React.CSSProperties
  showMinimap?: boolean
  showGrid?: boolean
}

export function FlowprintViewer({
  document: doc,
  className,
  style,
  showMinimap = true,
  showGrid = true,
}: FlowprintViewerProps) {
  const layout = useMemo(() => computeLayout(doc), [doc])

  const defaultViewport = useMemo(() => ({ x: 0, y: 0, zoom: 1 }), [])

  const proOptions: ReactFlowProps['proOptions'] = useMemo(() => ({ hideAttribution: true }), [])

  return (
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
        <LaneBackground lanes={layout.lanes} totalWidth={layout.width} />
        {layout.lineOfVisibilityY !== null && (
          <LineOfVisibility y={layout.lineOfVisibilityY} totalWidth={layout.width} />
        )}
        {showGrid && <Background variant={BackgroundVariant.Dots} gap={20} size={1} />}
        {showMinimap && <MiniMap pannable zoomable />}
      </ReactFlow>
    </div>
  )
}
