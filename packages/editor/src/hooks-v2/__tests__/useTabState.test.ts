import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabState } from '../useTabState'

describe('useTabState', () => {
  it('initial state has only Graph tab, active is graph', () => {
    const { result } = renderHook(() => useTabState())

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0]).toEqual({
      id: 'graph',
      label: 'Graph',
      type: 'graph',
      closable: false,
    })
    expect(result.current.activeTabId).toBe('graph')
  })

  it('openTab adds tab and activates it', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs[1]).toEqual({
      id: 'node-1',
      label: 'Action 1',
      type: 'action',
      closable: true,
    })
    expect(result.current.activeTabId).toBe('node-1')
  })

  it('opening existing tab just activates it (no duplicate)', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })
    act(() => {
      result.current.openTab('node-2', 'switch', 'Switch 1')
    })
    expect(result.current.activeTabId).toBe('node-2')

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })

    expect(result.current.tabs).toHaveLength(3) // graph + node-1 + node-2
    expect(result.current.activeTabId).toBe('node-1')
  })

  it('closeTab removes tab and activates neighbor', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })
    act(() => {
      result.current.openTab('node-2', 'switch', 'Switch 1')
    })
    // Active is node-2, tabs: graph, node-1, node-2

    act(() => {
      result.current.closeTab('node-2')
    })

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs.find((t) => t.id === 'node-2')).toBeUndefined()
    // Should activate previous neighbor (node-1)
    expect(result.current.activeTabId).toBe('node-1')
  })

  it('closeAllTabs returns to Graph only', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })
    act(() => {
      result.current.openTab('node-2', 'switch', 'Switch 1')
    })

    act(() => {
      result.current.closeAllTabs()
    })

    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].id).toBe('graph')
    expect(result.current.activeTabId).toBe('graph')
  })

  it('closeOtherTabs keeps specified + Graph', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })
    act(() => {
      result.current.openTab('node-2', 'switch', 'Switch 1')
    })
    act(() => {
      result.current.openTab('node-3', 'parallel', 'Parallel 1')
    })

    act(() => {
      result.current.closeOtherTabs('node-2')
    })

    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs.map((t) => t.id)).toEqual(['graph', 'node-2'])
    expect(result.current.activeTabId).toBe('node-2')
  })

  it('Graph tab cannot be closed', () => {
    const { result } = renderHook(() => useTabState())

    act(() => {
      result.current.openTab('node-1', 'action', 'Action 1')
    })

    act(() => {
      result.current.closeTab('graph')
    })

    expect(result.current.tabs.find((t) => t.id === 'graph')).toBeTruthy()
    expect(result.current.tabs).toHaveLength(2) // Still has graph + node-1
  })
})
