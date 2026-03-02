import type { ComponentType } from 'react'
import type { NodeProps } from '@xyflow/react'
import { registerNodeSpec } from '../registry'
import { actionSpec } from './action'
import { switchSpec } from './switch'
import { parallelSpec } from './parallel'
import { waitSpec } from './wait'
import { errorSpec } from './error'
import { terminalSpec } from './terminal'
import { triggerSpec } from './trigger'

const allSpecs = [
  actionSpec,
  switchSpec,
  parallelSpec,
  waitSpec,
  errorSpec,
  terminalSpec,
  triggerSpec,
]

for (const spec of allSpecs) {
  registerNodeSpec(spec)
}

export const nodeTypes: Record<string, ComponentType<NodeProps>> = {
  action: actionSpec.renderNode,
  switch: switchSpec.renderNode,
  parallel: parallelSpec.renderNode,
  wait: waitSpec.renderNode,
  error: errorSpec.renderNode,
  terminal: terminalSpec.renderNode,
  trigger: triggerSpec.renderNode,
}

export {
  actionSpec,
  switchSpec,
  parallelSpec,
  waitSpec,
  errorSpec,
  terminalSpec,
  triggerSpec,
}
