import { describe, it, expect } from 'vitest'
import {
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isErrorNode,
  isTerminalNode,
} from '../guards.js'
import type { Node } from '../types.js'

const actionNode: Node = { type: 'action', lane: 'main', label: 'A' }
const switchNode: Node = {
  type: 'switch',
  lane: 'main',
  label: 'S',
  cases: [{ when: 'yes', next: 'a' }],
}
const parallelNode: Node = {
  type: 'parallel',
  lane: 'main',
  label: 'P',
  branches: ['a'],
  join: 'b',
}
const waitNode: Node = {
  type: 'wait',
  lane: 'main',
  label: 'W',
  event: 'evt',
}
const errorNode: Node = { type: 'error', lane: 'main', label: 'E' }
const terminalNode: Node = {
  type: 'terminal',
  lane: 'main',
  label: 'T',
  outcome: 'success',
}

const allNodes: Node[] = [actionNode, switchNode, parallelNode, waitNode, errorNode, terminalNode]

describe('isActionNode', () => {
  it('returns true for action nodes', () => {
    expect(isActionNode(actionNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'action')) {
      expect(isActionNode(node)).toBe(false)
    }
  })
})

describe('isSwitchNode', () => {
  it('returns true for switch nodes', () => {
    expect(isSwitchNode(switchNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'switch')) {
      expect(isSwitchNode(node)).toBe(false)
    }
  })
})

describe('isParallelNode', () => {
  it('returns true for parallel nodes', () => {
    expect(isParallelNode(parallelNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'parallel')) {
      expect(isParallelNode(node)).toBe(false)
    }
  })
})

describe('isWaitNode', () => {
  it('returns true for wait nodes', () => {
    expect(isWaitNode(waitNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'wait')) {
      expect(isWaitNode(node)).toBe(false)
    }
  })
})

describe('isErrorNode', () => {
  it('returns true for error nodes', () => {
    expect(isErrorNode(errorNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'error')) {
      expect(isErrorNode(node)).toBe(false)
    }
  })
})

describe('isTerminalNode', () => {
  it('returns true for terminal nodes', () => {
    expect(isTerminalNode(terminalNode)).toBe(true)
  })
  it('returns false for all other node types', () => {
    for (const node of allNodes.filter((n) => n.type !== 'terminal')) {
      expect(isTerminalNode(node)).toBe(false)
    }
  })
})

describe('type narrowing', () => {
  it('narrows type correctly for action nodes', () => {
    const node: Node = actionNode
    if (isActionNode(node)) {
      // TypeScript should now allow accessing action-specific fields
      const _next: string | undefined = node.next
      expect(_next).toBeUndefined()
    }
  })

  it('narrows type correctly for switch nodes', () => {
    const node: Node = switchNode
    if (isSwitchNode(node)) {
      expect(node.cases).toBeDefined()
      expect(node.cases?.length).toBe(1)
    }
  })

  it('narrows type correctly for parallel nodes', () => {
    const node: Node = parallelNode
    if (isParallelNode(node)) {
      expect(node.branches).toBeDefined()
      expect(node.join).toBe('b')
    }
  })

  it('narrows type correctly for wait nodes', () => {
    const node: Node = waitNode
    if (isWaitNode(node)) {
      expect(node.event).toBe('evt')
    }
  })

  it('narrows type correctly for terminal nodes', () => {
    const node: Node = terminalNode
    if (isTerminalNode(node)) {
      expect(node.outcome).toBe('success')
    }
  })
})
