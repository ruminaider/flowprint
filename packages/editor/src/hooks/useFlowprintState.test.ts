/* eslint-disable @typescript-eslint/no-non-null-assertion -- test assertions guarantee non-null */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
} from '@ruminaider/flowprint-schema'
import { useFlowprintState } from './useFlowprintState'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDoc(overrides?: Partial<FlowprintDocument>): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '0.1.0',
    lanes: {
      user: { label: 'User', visibility: 'external', order: 0 },
      system: { label: 'System', visibility: 'internal', order: 1 },
    },
    nodes: {},
    ...overrides,
  }
}

function actionNode(overrides?: Partial<ActionNode>): ActionNode {
  return {
    type: 'action',
    lane: 'user',
    label: 'Do something',
    ...overrides,
  }
}

function switchNode(overrides?: Partial<SwitchNode>): SwitchNode {
  return {
    type: 'switch',
    lane: 'user',
    label: 'Check condition',
    cases: [{ when: 'yes', next: 'a' }],
    ...overrides,
  } as SwitchNode
}

function parallelNode(overrides?: Partial<ParallelNode>): ParallelNode {
  return {
    type: 'parallel',
    lane: 'user',
    label: 'Fork',
    branches: ['a', 'b'] as [string, ...string[]],
    join: 'c',
    ...overrides,
  } as ParallelNode
}

function waitNode(overrides?: Partial<WaitNode>): WaitNode {
  return {
    type: 'wait',
    lane: 'user',
    label: 'Wait for event',
    event: 'payment_received',
    ...overrides,
  }
}

function errorNode(overrides?: Partial<ErrorNode>): ErrorNode {
  return {
    type: 'error',
    lane: 'user',
    label: 'Handle error',
    ...overrides,
  }
}

function terminalNode(overrides?: Partial<TerminalNode>): TerminalNode {
  return {
    type: 'terminal',
    lane: 'user',
    label: 'Done',
    outcome: 'success',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// addNode
// ---------------------------------------------------------------------------

describe('addNode', () => {
  it('adds a node to the document', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('step1', actionNode())
    })

    expect(result.current.doc.nodes.step1).toBeDefined()
    expect(result.current.doc.nodes.step1!.label).toBe('Do something')
  })

  it('does not mutate the previous document', () => {
    const initial = makeDoc()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: initial }))

    const docBefore = result.current.doc
    act(() => {
      result.current.addNode('step1', actionNode())
    })

    expect(docBefore.nodes.step1).toBeUndefined()
    expect(result.current.doc.nodes.step1).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// updateNode
// ---------------------------------------------------------------------------

describe('updateNode', () => {
  it('applies a partial patch to an existing node', () => {
    const doc = makeDoc({ nodes: { a: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.updateNode('a', { label: 'Updated' })
    })

    expect(result.current.doc.nodes.a!.label).toBe('Updated')
    expect(result.current.doc.nodes.a!.type).toBe('action')
  })

  it('throws for non-existent node', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    expect(() => {
      act(() => {
        result.current.updateNode('missing', { label: 'x' })
      })
    }).toThrow("Node 'missing' not found")
  })
})

// ---------------------------------------------------------------------------
// updateNodePosition
// ---------------------------------------------------------------------------

describe('updateNodePosition', () => {
  it('sets position on a node', () => {
    const doc = makeDoc({ nodes: { a: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.updateNodePosition('a', { x: 100, y: 200 })
    })

    expect(result.current.doc.nodes.a!.position).toEqual({ x: 100, y: 200 })
  })

  it('is a no-op for non-existent node', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    // Should not throw, just silently skip
    act(() => {
      result.current.updateNodePosition('missing', { x: 0, y: 0 })
    })
  })

  it('can be undone', () => {
    const doc = makeDoc({ nodes: { a: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.updateNodePosition('a', { x: 100, y: 200 })
    })
    expect(result.current.doc.nodes.a!.position).toEqual({ x: 100, y: 200 })

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.a!.position).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// removeNode (with reference cleanup)
// ---------------------------------------------------------------------------

describe('removeNode', () => {
  it('removes the node from the document', () => {
    const doc = makeDoc({ nodes: { a: actionNode(), b: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('a')
    })

    expect(result.current.doc.nodes.a).toBeUndefined()
    expect(result.current.doc.nodes.b).toBeDefined()
  })

  it('cleans up action.next references', () => {
    const doc = makeDoc({
      nodes: {
        a: actionNode({ next: 'b' }),
        b: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('b')
    })

    const nodeA = result.current.doc.nodes.a as ActionNode
    expect(nodeA.next).toBeUndefined()
  })

  it('cleans up action.error.catch references', () => {
    const doc = makeDoc({
      nodes: {
        a: actionNode({ error: { catch: 'err' } }),
        err: errorNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('err')
    })

    const nodeA = result.current.doc.nodes.a as ActionNode
    expect(nodeA.error?.catch).toBeUndefined()
  })

  it('cleans up switch.cases[].next references', () => {
    const doc = makeDoc({
      nodes: {
        sw: switchNode({
          cases: [
            { when: 'yes', next: 'target' },
            { when: 'no', next: 'other' },
          ] as [{ when: string; next: string }, ...{ when: string; next: string }[]],
        }),
        target: actionNode(),
        other: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('target')
    })

    const sw = result.current.doc.nodes.sw as SwitchNode
    expect(sw.cases.length).toBe(1)
    expect(sw.cases[0].next).toBe('other')
  })

  it('cleans up switch.default references', () => {
    const doc = makeDoc({
      nodes: {
        sw: switchNode({ default: 'target' }),
        target: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('target')
    })

    const sw = result.current.doc.nodes.sw as SwitchNode
    expect(sw.default).toBeUndefined()
  })

  it('cleans up parallel.branches references', () => {
    const doc = makeDoc({
      nodes: {
        p: parallelNode({ branches: ['a', 'b', 'c'] as [string, ...string[]] }),
        a: actionNode(),
        b: actionNode(),
        c: actionNode(),
        j: actionNode(),
      },
    })
    // Set join to something other than 'b' so we only test branches
    ;(doc.nodes.p as ParallelNode).join = 'j'

    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('b')
    })

    const p = result.current.doc.nodes.p as ParallelNode
    expect(p.branches).toEqual(['a', 'c'])
  })

  it('cleans up parallel.join references', () => {
    const doc = makeDoc({
      nodes: {
        p: parallelNode({ join: 'j' }),
        j: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('j')
    })

    const p = result.current.doc.nodes.p as ParallelNode
    expect(p.join).toBe('')
  })

  it('cleans up wait.next references', () => {
    const doc = makeDoc({
      nodes: {
        w: waitNode({ next: 'target' }),
        target: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('target')
    })

    const w = result.current.doc.nodes.w as WaitNode
    expect(w.next).toBeUndefined()
  })

  it('cleans up wait.timeout_next references', () => {
    const doc = makeDoc({
      nodes: {
        w: waitNode({ timeout_next: 'target', timeout: '7d' }),
        target: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('target')
    })

    const w = result.current.doc.nodes.w as WaitNode
    expect(w.timeout_next).toBeUndefined()
  })

  it('cleans up error.next references', () => {
    const doc = makeDoc({
      nodes: {
        e: errorNode({ next: 'target' }),
        target: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.removeNode('target')
    })

    const e = result.current.doc.nodes.e as ErrorNode
    expect(e.next).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// connectNodes
// ---------------------------------------------------------------------------

describe('connectNodes', () => {
  it('sets next on an action node', () => {
    const doc = makeDoc({ nodes: { a: actionNode(), b: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('a', 'b', { type: 'next' })
    })

    expect((result.current.doc.nodes.a as ActionNode).next).toBe('b')
  })

  it('adds a switch case', () => {
    const doc = makeDoc({
      nodes: {
        sw: switchNode({ cases: [{ when: 'yes', next: 'a' }] as [{ when: string; next: string }] }),
        a: actionNode(),
        b: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('sw', 'b', { type: 'switch_case', when: 'no' })
    })

    const sw = result.current.doc.nodes.sw as SwitchNode
    expect(sw.cases.length).toBe(2)
    expect(sw.cases[1]!.when).toBe('no')
    expect(sw.cases[1]!.next).toBe('b')
  })

  it('sets switch default', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('sw', 'b', { type: 'switch_default' })
    })

    expect((result.current.doc.nodes.sw as SwitchNode).default).toBe('b')
  })

  it('adds a parallel branch', () => {
    const doc = makeDoc({
      nodes: { p: parallelNode(), d: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('p', 'd', { type: 'parallel_branch' })
    })

    const p = result.current.doc.nodes.p as ParallelNode
    expect(p.branches).toContain('d')
  })

  it('sets parallel join', () => {
    const doc = makeDoc({
      nodes: { p: parallelNode(), j: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('p', 'j', { type: 'parallel_join' })
    })

    expect((result.current.doc.nodes.p as ParallelNode).join).toBe('j')
  })

  it('sets next on a wait node', () => {
    const doc = makeDoc({ nodes: { w: waitNode(), b: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('w', 'b', { type: 'next' })
    })

    expect((result.current.doc.nodes.w as WaitNode).next).toBe('b')
  })

  it('sets timeout_next on a wait node', () => {
    const doc = makeDoc({
      nodes: { w: waitNode({ timeout: '7d' }), t: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('w', 't', { type: 'timeout_next' })
    })

    expect((result.current.doc.nodes.w as WaitNode).timeout_next).toBe('t')
  })

  it('sets error.catch on an action node', () => {
    const doc = makeDoc({
      nodes: { a: actionNode(), e: errorNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('a', 'e', { type: 'error_catch' })
    })

    expect((result.current.doc.nodes.a as ActionNode).error?.catch).toBe('e')
  })

  it('sets error.catch preserving existing retry config', () => {
    const doc = makeDoc({
      nodes: {
        a: actionNode({ error: { retry: { limit: 3, backoff: 'exponential' } } }),
        e: errorNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('a', 'e', { type: 'error_catch' })
    })

    const nodeA = result.current.doc.nodes.a as ActionNode
    expect(nodeA.error?.catch).toBe('e')
    expect(nodeA.error?.retry?.limit).toBe(3)
  })

  it('sets next on an error node', () => {
    const doc = makeDoc({ nodes: { e: errorNode(), b: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.connectNodes('e', 'b', { type: 'next' })
    })

    expect((result.current.doc.nodes.e as ErrorNode).next).toBe('b')
  })

  it('rejects connections from terminal nodes', () => {
    const doc = makeDoc({
      nodes: { t: terminalNode(), b: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    expect(() => {
      act(() => {
        result.current.connectNodes('t', 'b', { type: 'next' })
      })
    }).toThrow('Terminal nodes cannot have outgoing connections')
  })

  it('throws for non-existent source node', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    expect(() => {
      act(() => {
        result.current.connectNodes('missing', 'b', { type: 'next' })
      })
    }).toThrow("Source node 'missing' not found")
  })

  it('throws when applying switch_case to non-switch node', () => {
    const doc = makeDoc({ nodes: { a: actionNode() } })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    expect(() => {
      act(() => {
        result.current.connectNodes('a', 'b', { type: 'switch_case', when: 'x' })
      })
    }).toThrow('switch_case connection requires a switch node')
  })
})

// ---------------------------------------------------------------------------
// disconnectNodes
// ---------------------------------------------------------------------------

describe('disconnectNodes', () => {
  it('removes action.next reference', () => {
    const doc = makeDoc({
      nodes: { a: actionNode({ next: 'b' }), b: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('a', 'b')
    })

    expect((result.current.doc.nodes.a as ActionNode).next).toBeUndefined()
  })

  it('removes a specific switch case', () => {
    const doc = makeDoc({
      nodes: {
        sw: switchNode({
          cases: [
            { when: 'yes', next: 'a' },
            { when: 'no', next: 'b' },
          ] as [{ when: string; next: string }, ...{ when: string; next: string }[]],
        }),
        a: actionNode(),
        b: actionNode(),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('sw', 'a')
    })

    const sw = result.current.doc.nodes.sw as SwitchNode
    expect(sw.cases.length).toBe(1)
    expect(sw.cases[0].next).toBe('b')
  })

  it('removes switch.default reference', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode({ default: 'x' }), x: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('sw', 'x')
    })

    expect((result.current.doc.nodes.sw as SwitchNode).default).toBeUndefined()
  })

  it('removes a parallel branch', () => {
    const doc = makeDoc({
      nodes: {
        p: parallelNode({ branches: ['a', 'b', 'c'] as [string, ...string[]] }),
      },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('p', 'b')
    })

    expect((result.current.doc.nodes.p as ParallelNode).branches).toEqual(['a', 'c'])
  })

  it('removes parallel.join reference', () => {
    const doc = makeDoc({
      nodes: { p: parallelNode({ join: 'j' }), j: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('p', 'j')
    })

    expect((result.current.doc.nodes.p as ParallelNode).join).toBe('')
  })

  it('removes wait.timeout_next reference', () => {
    const doc = makeDoc({
      nodes: { w: waitNode({ timeout_next: 't', timeout: '7d' }), t: actionNode() },
    })
    const { result } = renderHook(() => useFlowprintState({ initialDoc: doc }))

    act(() => {
      result.current.disconnectNodes('w', 't')
    })

    expect((result.current.doc.nodes.w as WaitNode).timeout_next).toBeUndefined()
  })

  it('throws for non-existent source', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    expect(() => {
      act(() => {
        result.current.disconnectNodes('missing', 'b')
      })
    }).toThrow("Source node 'missing' not found")
  })
})

// ---------------------------------------------------------------------------
// Lane mutations
// ---------------------------------------------------------------------------

describe('lane mutations', () => {
  it('addLane adds a lane', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addLane('api', {
        label: 'API',
        visibility: 'internal',
        order: 2,
      })
    })

    expect(result.current.doc.lanes.api).toEqual({
      label: 'API',
      visibility: 'internal',
      order: 2,
    })
  })

  it('updateLane patches a lane', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.updateLane('user', { label: 'Customer' })
    })

    expect(result.current.doc.lanes.user!.label).toBe('Customer')
    expect(result.current.doc.lanes.user!.visibility).toBe('external')
  })

  it('updateLane throws for non-existent lane', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    expect(() => {
      act(() => {
        result.current.updateLane('missing', { label: 'x' })
      })
    }).toThrow("Lane 'missing' not found")
  })

  it('removeLane removes a lane', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.removeLane('system')
    })

    expect(result.current.doc.lanes.system).toBeUndefined()
    expect(result.current.doc.lanes.user).toBeDefined()
  })

  it('reorderLanes updates order values', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.reorderLanes(['system', 'user'])
    })

    expect(result.current.doc.lanes.system!.order).toBe(0)
    expect(result.current.doc.lanes.user!.order).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

describe('undo / redo', () => {
  it('starts with canUndo=false and canRedo=false', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('can undo a mutation', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    expect(result.current.doc.nodes.a).toBeDefined()
    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.a).toBeUndefined()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('can redo after undo', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    act(() => {
      result.current.undo()
    })
    act(() => {
      result.current.redo()
    })

    expect(result.current.doc.nodes.a).toBeDefined()
    expect(result.current.canRedo).toBe(false)
    expect(result.current.canUndo).toBe(true)
  })

  it('clears future on new mutation after undo', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    act(() => {
      result.current.addNode('b', actionNode())
    })
    act(() => {
      result.current.undo()
    })
    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.addNode('c', actionNode())
    })
    expect(result.current.canRedo).toBe(false)
  })

  it('supports multiple undo steps', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    act(() => {
      result.current.addNode('b', actionNode())
    })
    act(() => {
      result.current.addNode('c', actionNode())
    })

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.c).toBeUndefined()
    expect(result.current.doc.nodes.b).toBeDefined()

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.b).toBeUndefined()
    expect(result.current.doc.nodes.a).toBeDefined()

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.a).toBeUndefined()
  })

  it('undo with empty past is a no-op', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    const before = result.current.doc
    act(() => {
      result.current.undo()
    })

    expect(result.current.doc).toBe(before)
  })

  it('redo with empty future is a no-op', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    const before = result.current.doc
    act(() => {
      result.current.redo()
    })

    expect(result.current.doc).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// maxHistory trimming
// ---------------------------------------------------------------------------

describe('maxHistory', () => {
  it('trims oldest entries when exceeded', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), maxHistory: 3 }))

    // Make 5 mutations, only the last 3 should be undoable
    act(() => {
      result.current.addNode('a', actionNode())
    })
    act(() => {
      result.current.addNode('b', actionNode())
    })
    act(() => {
      result.current.addNode('c', actionNode())
    })
    act(() => {
      result.current.addNode('d', actionNode())
    })
    act(() => {
      result.current.addNode('e', actionNode())
    })

    // Undo 3 times should work
    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.e).toBeUndefined()

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.d).toBeUndefined()

    act(() => {
      result.current.undo()
    })
    expect(result.current.doc.nodes.c).toBeUndefined()

    // 4th undo should be a no-op (oldest entries were trimmed)
    expect(result.current.canUndo).toBe(false)
    const docBeforeExtra = result.current.doc
    act(() => {
      result.current.undo()
    })
    expect(result.current.doc).toBe(docBeforeExtra)
  })
})

// ---------------------------------------------------------------------------
// onChange callback
// ---------------------------------------------------------------------------

describe('onChange', () => {
  it('fires after a mutation', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.addNode('a', actionNode())
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nodes: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          a: expect.objectContaining({ type: 'action' }),
        }),
      }),
    )
  })

  it('fires after undo', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    onChange.mockClear()

    act(() => {
      result.current.undo()
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nodes: {} }))
  })

  it('fires after redo', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.addNode('a', actionNode())
    })
    act(() => {
      result.current.undo()
    })
    onChange.mockClear()

    act(() => {
      result.current.redo()
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        nodes: expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          a: expect.anything(),
        }),
      }),
    )
  })

  it('does not fire for no-op undo', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.undo()
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not fire for no-op redo', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.redo()
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// setDoc (controlled mode)
// ---------------------------------------------------------------------------

describe('setDoc', () => {
  it('replaces the document', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    const newDoc = makeDoc({ name: 'replaced' })
    act(() => {
      result.current.setDoc(newDoc)
    })

    expect(result.current.doc.name).toBe('replaced')
  })

  it('does not affect undo history', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    act(() => {
      result.current.addNode('a', actionNode())
    })

    const newDoc = makeDoc({ name: 'external' })
    act(() => {
      result.current.setDoc(newDoc)
    })

    // Undo should still restore to state before addNode, not before setDoc
    expect(result.current.canUndo).toBe(true)
    act(() => {
      result.current.undo()
    })

    // After undo, we get the state before addNode
    expect(result.current.doc.nodes.a).toBeUndefined()
  })

  it('does not fire onChange', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc(), onChange }))

    act(() => {
      result.current.setDoc(makeDoc({ name: 'x' }))
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

describe('immutability', () => {
  it('initialDoc is not referenced by the hook', () => {
    const initial = makeDoc()
    const { result } = renderHook(() => useFlowprintState({ initialDoc: initial }))

    // Mutate the original
    initial.name = 'mutated'

    expect(result.current.doc.name).toBe('test')
  })

  it('each mutation produces a new document reference', () => {
    const { result } = renderHook(() => useFlowprintState({ initialDoc: makeDoc() }))

    const doc1 = result.current.doc
    act(() => {
      result.current.addNode('a', actionNode())
    })
    const doc2 = result.current.doc

    expect(doc1).not.toBe(doc2)
  })
})
