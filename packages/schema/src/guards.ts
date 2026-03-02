import type {
  Node,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
  TriggerNode,
} from './types.js'

/**
 * Type guard: checks if a node is an ActionNode.
 */
export function isActionNode(node: Node): node is ActionNode {
  return node.type === 'action'
}

/**
 * Type guard: checks if a node is a SwitchNode.
 */
export function isSwitchNode(node: Node): node is SwitchNode {
  return node.type === 'switch'
}

/**
 * Type guard: checks if a node is a ParallelNode.
 */
export function isParallelNode(node: Node): node is ParallelNode {
  return node.type === 'parallel'
}

/**
 * Type guard: checks if a node is a WaitNode.
 */
export function isWaitNode(node: Node): node is WaitNode {
  return node.type === 'wait'
}

/**
 * Type guard: checks if a node is an ErrorNode.
 */
export function isErrorNode(node: Node): node is ErrorNode {
  return node.type === 'error'
}

/**
 * Type guard: checks if a node is a TerminalNode.
 */
export function isTerminalNode(node: Node): node is TerminalNode {
  return node.type === 'terminal'
}

/**
 * Type guard: checks if a node is a TriggerNode.
 */
export function isTriggerNode(node: Node): node is TriggerNode {
  return node.type === 'trigger'
}
