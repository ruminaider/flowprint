import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLaneReorder } from '../useLaneReorder'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDragEvent(data: Record<string, string> = {}): React.DragEvent {
  const storage = new Map(Object.entries(data))
  return {
    dataTransfer: {
      setData: (key: string, value: string) => { storage.set(key, value) },
      getData: (key: string) => storage.get(key) ?? '',
      effectAllowed: 'move',
    },
    preventDefault: vi.fn(),
    currentTarget: document.createElement('div'),
  } as unknown as React.DragEvent
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLaneReorder', () => {
  it('dragOverLaneId is null initially', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    expect(result.current.dragOverLaneId).toBeNull()
  })

  it('onDragStart sets data on dataTransfer', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    const event = makeDragEvent()

    act(() => {
      result.current.onDragStart(event, 'a')
    })

    expect(event.dataTransfer.getData('application/x-flowprint-lane-id')).toBe('a')
    expect(event.dataTransfer.effectAllowed).toBe('move')
  })

  it('onDrop calls onReorder with new lane order (move a before c)', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    // Simulate dragging 'a' and dropping on 'c'
    const startEvent = makeDragEvent()
    act(() => {
      result.current.onDragStart(startEvent, 'a')
    })

    const dropEvent = makeDragEvent({
      'application/x-flowprint-lane-id': 'a',
    })

    act(() => {
      result.current.onDrop(dropEvent, 'c')
    })

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'])
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(dropEvent.preventDefault).toHaveBeenCalled()
  })

  it('onDrop does nothing when source equals target', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    const dropEvent = makeDragEvent({
      'application/x-flowprint-lane-id': 'a',
    })

    act(() => {
      result.current.onDrop(dropEvent, 'a')
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('onDrop does nothing when source lane is not found', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    const dropEvent = makeDragEvent({
      'application/x-flowprint-lane-id': 'unknown',
    })

    act(() => {
      result.current.onDrop(dropEvent, 'b')
    })

    expect(onReorder).not.toHaveBeenCalled()
  })

  it('onDrop reorders correctly when moving last to first', () => {
    const onReorder = vi.fn()
    const { result } = renderHook(() =>
      useLaneReorder(['a', 'b', 'c'], onReorder),
    )

    const dropEvent = makeDragEvent({
      'application/x-flowprint-lane-id': 'c',
    })

    act(() => {
      result.current.onDrop(dropEvent, 'a')
    })

    expect(onReorder).toHaveBeenCalledWith(['c', 'a', 'b'])
  })
})
