import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SimulationProvider, useNodeHighlight } from './SimulationContext'
import type { NodeHighlightMap } from './SimulationContext'

describe('useNodeHighlight', () => {
  it('returns undefined with no provider', () => {
    const { result } = renderHook(() => useNodeHighlight('node-1'))
    expect(result.current).toBeUndefined()
  })

  it('returns correct state for known node ID', () => {
    const highlights: NodeHighlightMap = { 'node-1': 'active', 'node-2': 'visited' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationProvider value={highlights}>{children}</SimulationProvider>
    )
    const { result } = renderHook(() => useNodeHighlight('node-1'), { wrapper })
    expect(result.current).toBe('active')
  })

  it('returns undefined for unknown node ID', () => {
    const highlights: NodeHighlightMap = { 'node-1': 'active' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationProvider value={highlights}>{children}</SimulationProvider>
    )
    const { result } = renderHook(() => useNodeHighlight('unknown'), { wrapper })
    expect(result.current).toBeUndefined()
  })

  it('returns error state', () => {
    const highlights: NodeHighlightMap = { 'node-1': 'error' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationProvider value={highlights}>{children}</SimulationProvider>
    )
    const { result } = renderHook(() => useNodeHighlight('node-1'), { wrapper })
    expect(result.current).toBe('error')
  })

  it('returns visited state', () => {
    const highlights: NodeHighlightMap = { 'node-1': 'visited' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationProvider value={highlights}>{children}</SimulationProvider>
    )
    const { result } = renderHook(() => useNodeHighlight('node-1'), { wrapper })
    expect(result.current).toBe('visited')
  })
})
