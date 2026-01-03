import type { NodeTypes } from '@xyflow/react'
import ActionNode from './ActionNode'
import SwitchNode from './SwitchNode'
import ParallelNode from './ParallelNode'
import WaitNode from './WaitNode'
import ErrorNode from './ErrorNode'
import TerminalNode from './TerminalNode'

export const nodeTypes: NodeTypes = {
  action: ActionNode,
  switch: SwitchNode,
  parallel: ParallelNode,
  wait: WaitNode,
  error: ErrorNode,
  terminal: TerminalNode,
}
