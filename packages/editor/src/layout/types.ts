import type { Node as RFNode, Edge as RFEdge } from '@xyflow/react'

export interface LaneBand {
  laneId: string
  label: string
  visibility: 'external' | 'internal'
  order: number
  y: number
  height: number
  color: string
  borderColor: string
}

export interface LayoutResult {
  nodes: RFNode[]
  edges: RFEdge[]
  lanes: LaneBand[]
  lineOfVisibilityY: number | null
  width: number
  height: number
}
