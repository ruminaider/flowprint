/* eslint-disable @typescript-eslint/no-non-null-assertion -- test assertions guarantee non-null */
/* eslint-disable @typescript-eslint/unbound-method -- mock functions are not class methods */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { NodePalette } from './NodePalette'
import { useAddNode, PALETTE_NODE_TYPES, resetCounter } from '../hooks/useAddNode'
import type { UseFlowprintStateReturn } from '../hooks/useFlowprintState'
import type { LaneBand } from '../layout/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLane(
  overrides: Partial<LaneBand> & { laneId: string; y: number; height: number },
): LaneBand {
  return {
    label: overrides.laneId,
    visibility: 'external',
    order: 0,
    color: '#e0f2fe',
    borderColor: '#38bdf8',
    ...overrides,
  }
}

function makeState(overrides?: Partial<UseFlowprintStateReturn>): UseFlowprintStateReturn {
  const doc: FlowprintDocument = {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '0.1.0',
    lanes: {},
    nodes: {},
  }
  return {
    doc,
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

function makeDragEvent(data: Record<string, string>, clientY = 0): React.DragEvent {
  const dataStore = new Map(Object.entries(data))
  return {
    preventDefault: vi.fn(),
    clientY,
    dataTransfer: {
      getData: vi.fn((key: string) => dataStore.get(key) ?? ''),
      setData: vi.fn(),
      effectAllowed: '',
      dropEffect: '',
    },
  } as unknown as React.DragEvent
}

// ---------------------------------------------------------------------------
// NodePalette component tests
// ---------------------------------------------------------------------------

describe('NodePalette', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all 6 node types', () => {
    const { container } = render(<NodePalette />)

    const items = container.querySelectorAll('.fp-palette-item')
    expect(items.length).toBe(6)
  })

  it('renders the palette wrapper with fp-palette class', () => {
    const { container } = render(<NodePalette />)

    expect(container.querySelector('.fp-palette')).toBeTruthy()
  })

  it('renders each type with a type-specific CSS class', () => {
    const { container } = render(<NodePalette />)

    for (const type of PALETTE_NODE_TYPES) {
      expect(container.querySelector(`.fp-palette-item-${type}`)).toBeTruthy()
    }
  })

  it('renders each item with the correct label', () => {
    render(<NodePalette />)

    expect(screen.getByText('Action')).toBeTruthy()
    expect(screen.getByText('Switch')).toBeTruthy()
    expect(screen.getByText('Parallel')).toBeTruthy()
    expect(screen.getByText('Wait')).toBeTruthy()
    expect(screen.getByText('Error')).toBeTruthy()
    expect(screen.getByText('Terminal')).toBeTruthy()
  })

  it('each item is draggable', () => {
    const { container } = render(<NodePalette />)

    const items = container.querySelectorAll('.fp-palette-item')
    for (const item of items) {
      expect(item.getAttribute('draggable')).toBe('true')
    }
  })

  it('sets dataTransfer correctly on drag start', () => {
    const { container } = render(<NodePalette />)

    for (const type of PALETTE_NODE_TYPES) {
      const item = container.querySelector(`.fp-palette-item-${type}`)!
      const setData = vi.fn()
      const dataTransfer = {
        setData,
        effectAllowed: '' as string,
      }
      fireEvent.dragStart(item, { dataTransfer })

      expect(setData).toHaveBeenCalledWith('application/flowprint-node-type', type)
      expect(dataTransfer.effectAllowed).toBe('move')
    }
  })
})

// ---------------------------------------------------------------------------
// NodePalette dock variant tests
// ---------------------------------------------------------------------------

describe('NodePalette dock variant', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders with fp-palette--dock class', () => {
    const { container } = render(<NodePalette variant="dock" />)

    expect(container.querySelector('.fp-palette--dock')).toBeTruthy()
  })

  it('does not have fp-palette--dock class in panel variant', () => {
    const { container } = render(<NodePalette variant="panel" />)

    expect(container.querySelector('.fp-palette--dock')).toBeNull()
  })

  it('sets title attributes on items in dock variant', () => {
    const { container } = render(<NodePalette variant="dock" />)

    const items = container.querySelectorAll('.fp-palette-item')
    for (const item of items) {
      expect(item.getAttribute('title')).toBeTruthy()
    }
  })

  it('does not set title attributes in panel variant', () => {
    const { container } = render(<NodePalette />)

    const items = container.querySelectorAll('.fp-palette-item')
    for (const item of items) {
      expect(item.getAttribute('title')).toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// useAddNode hook tests
// ---------------------------------------------------------------------------

describe('useAddNode', () => {
  beforeEach(() => {
    resetCounter()
  })

  afterEach(() => {
    cleanup()
  })

  it('onDragOver prevents default and sets dropEffect', () => {
    const state = makeState()
    const { result } = renderHook(() => useAddNode(state, []))

    const event = makeDragEvent({})
    result.current.onDragOver(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.dataTransfer.dropEffect).toBe('move')
  })

  it('onDrop creates an action node with correct id', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const { result } = renderHook(() => useAddNode(state, []))

    const event = makeDragEvent({ 'application/flowprint-node-type': 'action' })
    result.current.onDrop(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(addNode).toHaveBeenCalledWith('new_action_1', {
      type: 'action',
      lane: '',
      label: 'New Action',
    })
  })

  it('onDrop increments counter for successive drops', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const { result } = renderHook(() => useAddNode(state, []))

    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'action' }))
    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'action' }))
    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'wait' }))

    expect(addNode).toHaveBeenNthCalledWith(1, 'new_action_1', expect.anything())
    expect(addNode).toHaveBeenNthCalledWith(2, 'new_action_2', expect.anything())
    expect(addNode).toHaveBeenNthCalledWith(3, 'new_wait_3', expect.anything())
  })

  it('onDrop creates correct default for each node type', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const { result } = renderHook(() => useAddNode(state, []))

    const types = PALETTE_NODE_TYPES
    for (const type of types) {
      result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': type }))
    }

    expect(addNode).toHaveBeenCalledTimes(6)

    // action
    expect(addNode.mock.calls[0]![1]).toEqual({
      type: 'action',
      lane: '',
      label: 'New Action',
    })

    // switch (empty cases — filled in by user via Properties panel)
    expect(addNode.mock.calls[1]![1]).toEqual({
      type: 'switch',
      lane: '',
      label: 'New Switch',
      cases: [],
    })

    // parallel (empty branches — filled in by user via edge connections)
    expect(addNode.mock.calls[2]![1]).toEqual({
      type: 'parallel',
      lane: '',
      label: 'New Parallel',
      branches: [],
      join: '',
    })

    // wait
    expect(addNode.mock.calls[3]![1]).toEqual({
      type: 'wait',
      lane: '',
      label: 'New Wait',
      event: 'event_name',
    })

    // error
    expect(addNode.mock.calls[4]![1]).toEqual({
      type: 'error',
      lane: '',
      label: 'New Error',
    })

    // terminal
    expect(addNode.mock.calls[5]![1]).toEqual({
      type: 'terminal',
      lane: '',
      label: 'New Terminal',
      outcome: 'success',
    })
  })

  it('onDrop assigns lane when drop lands within a lane band', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const lanes: LaneBand[] = [
      makeLane({ laneId: 'user', y: 0, height: 140, order: 0 }),
      makeLane({ laneId: 'system', y: 160, height: 140, order: 1, visibility: 'internal' }),
    ]
    const { result } = renderHook(() => useAddNode(state, lanes))

    // Drop within the 'system' lane band (y=160..300)
    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'action' }, 200))

    expect(addNode).toHaveBeenCalledWith('new_action_1', {
      type: 'action',
      lane: 'system',
      label: 'New Action',
    })
  })

  it('onDrop assigns empty lane when drop is outside all lanes', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const lanes: LaneBand[] = [makeLane({ laneId: 'user', y: 0, height: 140, order: 0 })]
    const { result } = renderHook(() => useAddNode(state, lanes))

    // Drop well below all lanes
    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'action' }, 500))

    expect(addNode).toHaveBeenCalledWith('new_action_1', {
      type: 'action',
      lane: '',
      label: 'New Action',
    })
  })

  it('onDrop ignores unknown node types', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const { result } = renderHook(() => useAddNode(state, []))

    result.current.onDrop(makeDragEvent({ 'application/flowprint-node-type': 'bogus' }))

    expect(addNode).not.toHaveBeenCalled()
  })

  it('onDrop ignores events with no dataTransfer type', () => {
    const addNode = vi.fn()
    const state = makeState({ addNode })
    const { result } = renderHook(() => useAddNode(state, []))

    result.current.onDrop(makeDragEvent({}))

    expect(addNode).not.toHaveBeenCalled()
  })
})
