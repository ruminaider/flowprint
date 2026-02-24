import type { EdgeTypes } from '@xyflow/react'
import SmoothstepEdge from './SmoothstepEdge'
import ErrorEdge from './ErrorEdge'
import ConditionalEdge from './ConditionalEdge'

export const edgeTypes: EdgeTypes = {
  normal: SmoothstepEdge,
  error: ErrorEdge,
  default: SmoothstepEdge,
  conditional: ConditionalEdge,
}
