import { createContext, useContext } from 'react'

export type NodeHighlightState = 'active' | 'visited' | 'error'
export type NodeHighlightMap = Record<string, NodeHighlightState>

const SimulationContext = createContext<NodeHighlightMap>({})

export const SimulationProvider = SimulationContext.Provider

export function useNodeHighlight(nodeId: string): NodeHighlightState | undefined {
  const map = useContext(SimulationContext)
  return map[nodeId]
}
