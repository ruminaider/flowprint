import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLaneCollapse } from '../useLaneCollapse'

describe('useLaneCollapse', () => {
  it('initially has no lanes collapsed', () => {
    const { result } = renderHook(() => useLaneCollapse())

    expect(result.current.collapsedIds.size).toBe(0)
  })

  it('toggleCollapse adds a lane, second call removes it', () => {
    const { result } = renderHook(() => useLaneCollapse())

    act(() => {
      result.current.toggleCollapse('lane-1')
    })
    expect(result.current.isCollapsed('lane-1')).toBe(true)

    act(() => {
      result.current.toggleCollapse('lane-1')
    })
    expect(result.current.isCollapsed('lane-1')).toBe(false)
  })

  it('collapseAll collapses specified lanes', () => {
    const { result } = renderHook(() => useLaneCollapse())

    act(() => {
      result.current.collapseAll(['lane-1', 'lane-2', 'lane-3'])
    })

    expect(result.current.isCollapsed('lane-1')).toBe(true)
    expect(result.current.isCollapsed('lane-2')).toBe(true)
    expect(result.current.isCollapsed('lane-3')).toBe(true)
    expect(result.current.isCollapsed('lane-4')).toBe(false)
  })

  it('expandAll clears all collapsed lanes', () => {
    const { result } = renderHook(() => useLaneCollapse())

    act(() => {
      result.current.collapseAll(['lane-1', 'lane-2'])
    })
    expect(result.current.collapsedIds.size).toBe(2)

    act(() => {
      result.current.expandAll()
    })
    expect(result.current.collapsedIds.size).toBe(0)
  })

  it('isCollapsed returns correct state', () => {
    const { result } = renderHook(() => useLaneCollapse())

    expect(result.current.isCollapsed('lane-1')).toBe(false)

    act(() => {
      result.current.toggleCollapse('lane-1')
    })
    expect(result.current.isCollapsed('lane-1')).toBe(true)
    expect(result.current.isCollapsed('lane-2')).toBe(false)
  })

  it('collapsedIds returns the current set', () => {
    const { result } = renderHook(() => useLaneCollapse())

    act(() => {
      result.current.toggleCollapse('a')
      result.current.toggleCollapse('b')
    })

    expect(result.current.collapsedIds).toEqual(new Set(['a', 'b']))
  })
})
