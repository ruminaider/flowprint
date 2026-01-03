import type { EdgeTypes } from '@xyflow/react'
import NormalEdge from './NormalEdge'
import ErrorEdge from './ErrorEdge'
import DefaultEdge from './DefaultEdge'

export const edgeTypes: EdgeTypes = {
  normal: NormalEdge,
  error: ErrorEdge,
  default: DefaultEdge,
}
