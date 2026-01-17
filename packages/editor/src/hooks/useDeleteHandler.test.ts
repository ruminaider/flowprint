/* eslint-disable @typescript-eslint/unbound-method -- mock functions are not class methods */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { render, screen, fireEvent } from '@testing-library/react'
import type { FlowprintDocument, ActionNode } from '@ruminaider/flowprint-schema'
import type { Node, Edge } from '@xyflow/react'
import { useDeleteHandler } from './useDeleteHandler'
import type { UseFlowprintStateReturn } from './useFlowprintState'
import { DeleteConfirmation } from '../components/DeleteConfirmation'

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

function makeState(overrides?: Partial<UseFlowprintStateReturn>): UseFlowprintStateReturn {
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

function rfNode(id: string): Node {
  return { id, position: { x: 0, y: 0 }, data: {} }
}

function rfEdge(id: string): Edge {
  return { id, source: '', target: '' }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
})

describe('useDeleteHandler', () => {
  describe('onNodesDelete', () => {
    it('deletes a node with < 3 connections directly', () => {
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'b' }),
          b: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onNodesDelete([rfNode('b')])
      })

      expect(state.removeNode).toHaveBeenCalledWith('b')
      expect(result.current.pendingDeletion).toBeNull()
    })

    it('deletes a node with 0 connections directly', () => {
      const doc = makeDoc({
        nodes: { a: actionNode() },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onNodesDelete([rfNode('a')])
      })

      expect(state.removeNode).toHaveBeenCalledWith('a')
      expect(result.current.pendingDeletion).toBeNull()
    })

    it('sets pendingDeletion for a node with >= 3 connections', () => {
      // Node 'hub' has 3 connections: outgoing to b, c, and incoming from a
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'hub' }),
          hub: actionNode({ next: 'b', error: { catch: 'c' } }),
          b: actionNode(),
          c: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onNodesDelete([rfNode('hub')])
      })

      expect(state.removeNode).not.toHaveBeenCalled()
      expect(result.current.pendingDeletion).toEqual({
        type: 'node',
        id: 'hub',
        connectionCount: 3,
      })
    })

    it('sets pendingDeletion for a node with exactly 3 connections', () => {
      // Node 'center' is source of 2 edges and target of 1 edge = 3 connections
      const doc = makeDoc({
        nodes: {
          start: actionNode({ next: 'center' }),
          center: actionNode({ next: 'end1', error: { catch: 'end2' } }),
          end1: actionNode(),
          end2: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onNodesDelete([rfNode('center')])
      })

      expect(state.removeNode).not.toHaveBeenCalled()
      expect(result.current.pendingDeletion).toEqual({
        type: 'node',
        id: 'center',
        connectionCount: 3,
      })
    })
  })

  describe('confirmDeletion', () => {
    it('calls removeNode and clears pendingDeletion', () => {
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'hub' }),
          hub: actionNode({ next: 'b', error: { catch: 'c' } }),
          b: actionNode(),
          c: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      // Trigger pending state
      act(() => {
        result.current.onNodesDelete([rfNode('hub')])
      })
      expect(result.current.pendingDeletion).not.toBeNull()

      // Confirm
      act(() => {
        result.current.confirmDeletion()
      })

      expect(state.removeNode).toHaveBeenCalledWith('hub')
      expect(result.current.pendingDeletion).toBeNull()
    })

    it('is a no-op when there is no pending deletion', () => {
      const doc = makeDoc()
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.confirmDeletion()
      })

      expect(state.removeNode).not.toHaveBeenCalled()
      expect(result.current.pendingDeletion).toBeNull()
    })
  })

  describe('cancelDeletion', () => {
    it('clears pendingDeletion without calling removeNode', () => {
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'hub' }),
          hub: actionNode({ next: 'b', error: { catch: 'c' } }),
          b: actionNode(),
          c: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      // Trigger pending state
      act(() => {
        result.current.onNodesDelete([rfNode('hub')])
      })
      expect(result.current.pendingDeletion).not.toBeNull()

      // Cancel
      act(() => {
        result.current.cancelDeletion()
      })

      expect(state.removeNode).not.toHaveBeenCalled()
      expect(result.current.pendingDeletion).toBeNull()
    })
  })

  describe('onEdgesDelete', () => {
    it('parses edge ID and calls disconnectNodes', () => {
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'b' }),
          b: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onEdgesDelete([rfEdge('e-a-b-0')])
      })

      expect(state.disconnectNodes).toHaveBeenCalledWith('a', 'b')
    })

    it('handles multiple edge deletions', () => {
      const doc = makeDoc({
        nodes: {
          a: actionNode({ next: 'b' }),
          b: actionNode({ next: 'c' }),
          c: actionNode(),
        },
      })
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onEdgesDelete([rfEdge('e-a-b-0'), rfEdge('e-b-c-1')])
      })

      expect(state.disconnectNodes).toHaveBeenCalledTimes(2)
      expect(state.disconnectNodes).toHaveBeenCalledWith('a', 'b')
      expect(state.disconnectNodes).toHaveBeenCalledWith('b', 'c')
    })

    it('skips edges with unrecognised ID format', () => {
      const doc = makeDoc()
      const state = makeState()

      const { result } = renderHook(() => useDeleteHandler(state, doc))

      act(() => {
        result.current.onEdgesDelete([rfEdge('invalid-id')])
      })

      expect(state.disconnectNodes).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// DeleteConfirmation component
// ---------------------------------------------------------------------------

describe('DeleteConfirmation', () => {
  it('renders the node ID and connection count', () => {
    render(
      DeleteConfirmation({
        nodeId: 'my-node',
        connectionCount: 5,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    )

    expect(screen.getByText(/my-node/)).toBeTruthy()
    expect(screen.getByText(/5 connections/)).toBeTruthy()
  })

  it('calls onConfirm when Confirm button is clicked', () => {
    const onConfirm = vi.fn()

    render(
      DeleteConfirmation({
        nodeId: 'test',
        connectionCount: 3,
        onConfirm,
        onCancel: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn()

    render(
      DeleteConfirmation({
        nodeId: 'test',
        connectionCount: 3,
        onConfirm: vi.fn(),
        onCancel,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('applies the fp-delete-confirm CSS class', () => {
    const { container } = render(
      DeleteConfirmation({
        nodeId: 'test',
        connectionCount: 3,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    )

    expect(container.querySelector('.fp-delete-confirm')).toBeTruthy()
  })
})
