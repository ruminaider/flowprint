import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLaneResize } from './useLaneResize'
import type { LaneBand } from '../layout/types'

// Mock @xyflow/react — useLaneResize doesn't use it directly but
// the test env needs it available for transitive imports
vi.mock('@xyflow/react', () => ({
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}))

function makeBands(heights: number[]): LaneBand[] {
  let y = 0
  return heights.map((h, i) => {
    const band: LaneBand = {
      laneId: `lane-${String(i)}`,
      label: `Lane ${String(i)}`,
      visibility: i === 0 ? 'external' : 'internal',
      order: i,
      y,
      height: h,
      color: '#ccc',
      borderColor: '#999',
    }
    y += h
    return band
  })
}

describe('useLaneResize', () => {
  const updateLane = vi.fn()
  const state = { updateLane }
  let zoomRef: { current: number }

  beforeEach(() => {
    updateLane.mockClear()
    zoomRef = { current: 1 }
  })

  afterEach(() => {
    // Clean up any lingering window listeners
  })

  it('returns initial state with no resize in progress', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    expect(result.current.resizeOverride).toBeNull()
    expect(result.current.isResizing).toBe(false)
  })

  it('does nothing in readOnly mode', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, true))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    expect(result.current.isResizing).toBe(false)
    expect(updateLane).not.toHaveBeenCalled()
  })

  it('sets isResizing on pointerdown', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    expect(result.current.isResizing).toBe(true)
  })

  it('updates resizeOverride on pointermove', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientY: 250 }))
    })

    expect(result.current.resizeOverride).toEqual({
      laneId: 'lane-0',
      height: 250, // 200 + 50
    })
  })

  it('accounts for zoom when computing resize delta', () => {
    const bands = makeBands([200, 200])
    zoomRef.current = 0.5 // 50% zoom — 50px screen = 100px flow
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientY: 250 }))
    })

    expect(result.current.resizeOverride).toEqual({
      laneId: 'lane-0',
      height: 300, // 200 + (50 / 0.5) = 300
    })
  })

  it('clamps to MIN_LANE_HEIGHT on shrink', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    // Drag up by 100px — would shrink to 100, but clamps to 140
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientY: 100 }))
    })

    expect(result.current.resizeOverride).toEqual({
      laneId: 'lane-0',
      height: 140, // clamped
    })
  })

  it('commits height on pointerup and clears state', () => {
    const bands = makeBands([200, 200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(0, event)
    })

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { clientY: 280 }))
    })

    expect(updateLane).toHaveBeenCalledWith('lane-0', { height: 280 })
    expect(result.current.resizeOverride).toBeNull()
    expect(result.current.isResizing).toBe(false)
  })

  it('ignores invalid lane index', () => {
    const bands = makeBands([200])
    const { result } = renderHook(() => useLaneResize(state, bands, zoomRef, false))

    const event = new PointerEvent('pointerdown', { clientY: 200 }) as unknown as React.PointerEvent
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() })

    act(() => {
      result.current.handlePointerDown(5, event)
    })

    expect(result.current.isResizing).toBe(false)
  })
})
