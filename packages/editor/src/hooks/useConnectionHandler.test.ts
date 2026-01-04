import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Connection } from '@xyflow/react'
import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
} from '@ruminaider/flowprint-schema'
import type { UseFlowprintStateReturn } from './useFlowprintState'
import { useConnectionHandler } from './useConnectionHandler'

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

function connection(source: string, target: string): Connection {
  return { source, target, sourceHandle: null, targetHandle: null }
}

function mockState(overrides?: Partial<UseFlowprintStateReturn>): UseFlowprintStateReturn {
  return {
    doc: makeDoc(),
    addNode: vi.fn(),
    updateNode: vi.fn(),
    removeNode: vi.fn(),
    connectNodes: vi.fn(),
    disconnectNodes: vi.fn(),
    addLane: vi.fn(),
    updateLane: vi.fn(),
    removeLane: vi.fn(),
    reorderLanes: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    setDoc: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// onConnect
// ---------------------------------------------------------------------------

describe('onConnect', () => {
  it('connects action→action with next', () => {
    const doc = makeDoc({
      nodes: { a: actionNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('a', 'b')))

    expect(state.connectNodes).toHaveBeenCalledWith('a', 'b', { type: 'next' })
  })

  it('connects wait→action with next', () => {
    const doc = makeDoc({
      nodes: { w: waitNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('w', 'b')))

    expect(state.connectNodes).toHaveBeenCalledWith('w', 'b', { type: 'next' })
  })

  it('connects error→action with next', () => {
    const doc = makeDoc({
      nodes: { e: errorNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('e', 'b')))

    expect(state.connectNodes).toHaveBeenCalledWith('e', 'b', { type: 'next' })
  })

  it('connects parallel→action with parallel_branch', () => {
    const doc = makeDoc({
      nodes: { p: parallelNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('p', 'b')))

    expect(state.connectNodes).toHaveBeenCalledWith('p', 'b', {
      type: 'parallel_branch',
    })
  })

  it('sets pendingSwitchConnection for switch→action (does not call connectNodes)', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('sw', 'b')))

    expect(state.connectNodes).not.toHaveBeenCalled()
    expect(result.current.pendingSwitchConnection).toEqual({
      source: 'sw',
      target: 'b',
    })
  })

  it('rejects self-loops (no connectNodes called)', () => {
    const doc = makeDoc({
      nodes: { a: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('a', 'a')))

    expect(state.connectNodes).not.toHaveBeenCalled()
  })

  it('rejects terminal source (no connectNodes called)', () => {
    const doc = makeDoc({
      nodes: { t: terminalNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('t', 'b')))

    expect(state.connectNodes).not.toHaveBeenCalled()
  })

  it('ignores connection from non-existent source', () => {
    const doc = makeDoc({ nodes: { b: actionNode() } })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('missing', 'b')))

    expect(state.connectNodes).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// isValidConnection
// ---------------------------------------------------------------------------

describe('isValidConnection', () => {
  it('returns true for action→action', () => {
    const doc = makeDoc({
      nodes: { a: actionNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('a', 'b'))).toBe(true)
  })

  it('returns true for switch→action', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('sw', 'b'))).toBe(true)
  })

  it('returns true for parallel→action', () => {
    const doc = makeDoc({
      nodes: { p: parallelNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('p', 'b'))).toBe(true)
  })

  it('returns false for self-loops', () => {
    const doc = makeDoc({
      nodes: { a: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('a', 'a'))).toBe(false)
  })

  it('returns false when source is a terminal node', () => {
    const doc = makeDoc({
      nodes: { t: terminalNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('t', 'b'))).toBe(false)
  })

  it('returns false when source node does not exist', () => {
    const doc = makeDoc({ nodes: { b: actionNode() } })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.isValidConnection(connection('missing', 'b'))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// confirmSwitchConnection
// ---------------------------------------------------------------------------

describe('confirmSwitchConnection', () => {
  it('adds a switch_case connection', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    // First set up pending connection
    act(() => result.current.onConnect(connection('sw', 'b')))
    expect(result.current.pendingSwitchConnection).not.toBeNull()

    // Confirm with a case condition
    act(() => result.current.confirmSwitchConnection('approved'))

    expect(state.connectNodes).toHaveBeenCalledWith('sw', 'b', {
      type: 'switch_case',
      when: 'approved',
    })
    expect(result.current.pendingSwitchConnection).toBeNull()
  })

  it('adds a switch_default connection when isDefault=true', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('sw', 'b')))
    act(() => result.current.confirmSwitchConnection('ignored', true))

    expect(state.connectNodes).toHaveBeenCalledWith('sw', 'b', {
      type: 'switch_default',
    })
    expect(result.current.pendingSwitchConnection).toBeNull()
  })

  it('is a no-op when there is no pending connection', () => {
    const doc = makeDoc({ nodes: {} })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.confirmSwitchConnection('test'))

    expect(state.connectNodes).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// cancelSwitchConnection
// ---------------------------------------------------------------------------

describe('cancelSwitchConnection', () => {
  it('clears pending switch connection', () => {
    const doc = makeDoc({
      nodes: { sw: switchNode(), b: actionNode() },
    })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    act(() => result.current.onConnect(connection('sw', 'b')))
    expect(result.current.pendingSwitchConnection).not.toBeNull()

    act(() => result.current.cancelSwitchConnection())
    expect(result.current.pendingSwitchConnection).toBeNull()
  })

  it('is a no-op when there is no pending connection', () => {
    const doc = makeDoc({ nodes: {} })
    const state = mockState({ doc })

    const { result } = renderHook(() => useConnectionHandler(state, doc))

    expect(result.current.pendingSwitchConnection).toBeNull()
    act(() => result.current.cancelSwitchConnection())
    expect(result.current.pendingSwitchConnection).toBeNull()
  })
})
