import { createContext, useContext } from 'react'

// ── Node highlights (existing) ──────────────────

export type NodeHighlightState = 'active' | 'visited' | 'departing' | 'error'
export type NodeHighlightMap = Record<string, NodeHighlightState>

const SimulationContext = createContext<NodeHighlightMap>({})

export const SimulationProvider = SimulationContext.Provider

export function useNodeHighlight(nodeId: string): NodeHighlightState | undefined {
  const map = useContext(SimulationContext)
  return map[nodeId]
}

// ── Edge highlights ─────────────────────────────

export type EdgeHighlightState = 'traversing' | 'traversed'
export type EdgeHighlightMap = Record<string, EdgeHighlightState>

const EdgeSimulationContext = createContext<EdgeHighlightMap>({})

export const EdgeSimulationProvider = EdgeSimulationContext.Provider

export function useEdgeHighlight(edgeId: string): EdgeHighlightState | undefined {
  const map = useContext(EdgeSimulationContext)
  return map[edgeId]
}

// ── Animation config ────────────────────────────

export interface SimulationAnimationConfig {
  isForwardStep: boolean
  particleDurationMs: number
  stepKey: number
}

const defaultAnimationConfig: SimulationAnimationConfig = {
  isForwardStep: false,
  particleDurationMs: 600,
  stepKey: 0,
}

const SimulationAnimationContext = createContext<SimulationAnimationConfig>(defaultAnimationConfig)

export const SimulationAnimationProvider = SimulationAnimationContext.Provider

export function useSimulationAnimation(): SimulationAnimationConfig {
  return useContext(SimulationAnimationContext)
}
