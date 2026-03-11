import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  SimulationProvider,
  useNodeHighlight,
  EdgeSimulationProvider,
  useEdgeHighlight,
  SimulationAnimationProvider,
  useSimulationAnimation,
} from './SimulationContext'
import type {
  NodeHighlightMap,
  EdgeHighlightMap,
  SimulationAnimationConfig,
} from './SimulationContext'

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

describe('useEdgeHighlight', () => {
  it('returns undefined with no provider', () => {
    const { result } = renderHook(() => useEdgeHighlight('e-a-b-0'))
    expect(result.current).toBeUndefined()
  })

  it('returns traversing state', () => {
    const edges: EdgeHighlightMap = { 'e-a-b-0': 'traversing' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EdgeSimulationProvider value={edges}>{children}</EdgeSimulationProvider>
    )
    const { result } = renderHook(() => useEdgeHighlight('e-a-b-0'), { wrapper })
    expect(result.current).toBe('traversing')
  })

  it('returns traversed state', () => {
    const edges: EdgeHighlightMap = { 'e-a-b-0': 'traversed' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EdgeSimulationProvider value={edges}>{children}</EdgeSimulationProvider>
    )
    const { result } = renderHook(() => useEdgeHighlight('e-a-b-0'), { wrapper })
    expect(result.current).toBe('traversed')
  })

  it('returns undefined for unknown edge ID', () => {
    const edges: EdgeHighlightMap = { 'e-a-b-0': 'traversing' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EdgeSimulationProvider value={edges}>{children}</EdgeSimulationProvider>
    )
    const { result } = renderHook(() => useEdgeHighlight('e-x-y-0'), { wrapper })
    expect(result.current).toBeUndefined()
  })
})

describe('useSimulationAnimation', () => {
  it('returns default config with no provider', () => {
    const { result } = renderHook(() => useSimulationAnimation())
    expect(result.current).toEqual({
      isForwardStep: false,
      particleDurationMs: 600,
      stepKey: 0,
    })
  })

  it('returns provided config', () => {
    const config: SimulationAnimationConfig = {
      isForwardStep: false,
      particleDurationMs: 300,
      stepKey: 5,
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationAnimationProvider value={config}>{children}</SimulationAnimationProvider>
    )
    const { result } = renderHook(() => useSimulationAnimation(), { wrapper })
    expect(result.current).toEqual({
      isForwardStep: false,
      particleDurationMs: 300,
      stepKey: 5,
    })
  })
})
