import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { simulateGraph } from '@ruminaider/flowprint-engine/browser'
import type {
  SimulationTrace,
  SimulationStep,
  SimulationOptions,
  RulesDocument,
} from '@ruminaider/flowprint-engine/browser'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { getEdges } from '@ruminaider/flowprint-schema'
import type { NodeHighlightMap } from '@ruminaider/flowprint-editor'
import type { EdgeHighlightMap, SimulationAnimationConfig } from '@ruminaider/flowprint-editor'
import type { RulesDataMap } from '@ruminaider/flowprint-editor'

export interface UseSimulationReturn {
  isActive: boolean
  trace: SimulationTrace | null
  currentStep: number
  totalSteps: number
  currentNodeId: string | undefined
  currentStepData: SimulationStep | undefined
  nodeHighlights: NodeHighlightMap
  error: string | null

  start: (input: unknown, fixtures?: Record<string, unknown>) => void
  stop: () => void
  stepForward: () => void
  stepBack: () => void
  goToStep: (step: number) => void
  reset: () => void
  setAutoPlay: (enabled: boolean) => void
  isAutoPlaying: boolean
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  edgeHighlights: EdgeHighlightMap
  simulationAnimation: SimulationAnimationConfig
}

interface TraceSnapshots {
  highlights: NodeHighlightMap[]
  edgeHighlights: EdgeHighlightMap[]
  contexts: Record<string, unknown>[]
}

/**
 * Build a lookup from "source->target" to React Flow edge ID.
 * Mirrors the ID pattern in layout-engine.ts: `e-${source}-${target}-${index}`
 */
function buildEdgeLookup(doc: FlowprintDocument): Map<string, string> {
  const schemaEdges = getEdges(doc)
  const lookup = new Map<string, string>()
  for (let i = 0; i < schemaEdges.length; i++) {
    const edge = schemaEdges[i]
    if (!edge) continue
    const key = `${edge.source}->${edge.target}`
    // First occurrence wins (matches computeEdges index ordering)
    if (!lookup.has(key)) {
      lookup.set(key, `e-${edge.source}-${edge.target}-${String(i)}`)
    }
  }
  return lookup
}

/**
 * Pre-compute highlight and context snapshots for every step index.
 * One-time O(n) pass when trace arrives, then O(1) access per step.
 * Each entry is a point-in-time snapshot (Review #36).
 */
function buildTraceSnapshots(
  steps: SimulationStep[],
  edgeLookup: Map<string, string>,
): TraceSnapshots {
  const highlights: NodeHighlightMap[] = []
  const edgeHighlights: EdgeHighlightMap[] = []
  const contexts: Record<string, unknown>[] = []
  const cumulativeCtx: Record<string, unknown> = {}

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const snapshot: NodeHighlightMap = {}
    const edgeSnapshot: EdgeHighlightMap = {}

    // Mark all previously visited nodes
    for (let j = 0; j < i; j++) {
      const prev = steps[j]
      if (!prev) continue
      snapshot[prev.node_id] = prev.status === 'error' ? 'error' : 'visited'
    }

    // Mark the incoming edge (previous → current) as traversing.
    // This shows the signal arriving at the active node rather than
    // departing, which naturally means step 0 has no edge animation
    // and parallel branches find their edge from the hub node.
    if (i > 0) {
      const prevStep = steps[i - 1]
      if (prevStep) {
        // Strategy 1: direct edge from previous step
        let edgeId = edgeLookup.get(`${prevStep.node_id}->${step.node_id}`)

        // Strategy 2: edge via previous step's routing target
        // (handles parallel hub skipping: build_project.next=run_tests → run_tests→run_unit_tests)
        if (!edgeId && prevStep.next && prevStep.next !== step.node_id) {
          edgeId = edgeLookup.get(`${prevStep.next}->${step.node_id}`)
        }

        // Strategy 3: find any edge targeting this node in the schema
        // (handles 2nd+ parallel branches where prev step is a sibling branch)
        if (!edgeId) {
          for (const [key, eid] of edgeLookup.entries()) {
            if (key.endsWith(`->${step.node_id}`)) {
              edgeId = eid
              break
            }
          }
        }

        if (edgeId) {
          edgeSnapshot[edgeId] = 'traversing'
        }
      }
    }

    // Mark current node
    snapshot[step.node_id] = step.status === 'error' ? 'error' : 'active'

    highlights.push(snapshot)
    edgeHighlights.push(edgeSnapshot)

    // Build cumulative context
    if (step.stepOutput) {
      cumulativeCtx[step.stepOutput.nodeId] = step.stepOutput.value
    }
    contexts.push({ ...cumulativeCtx })
  }

  return { highlights, edgeHighlights, contexts }
}

/**
 * Convert RulesDataMap (editor types) to Record<string, RulesDocument> (engine types).
 */
function convertRulesData(map: RulesDataMap): Record<string, RulesDocument> {
  const result: Record<string, RulesDocument> = {}
  for (const [key, entry] of Object.entries(map)) {
    if (entry.data) {
      result[key] = entry.data as unknown as RulesDocument
    }
  }
  return result
}

const emptyHighlights: NodeHighlightMap = {}
const emptyEdgeHighlightsMap: EdgeHighlightMap = {}

export function useSimulation(
  doc: FlowprintDocument | null,
  rulesDataMap: RulesDataMap,
): UseSimulationReturn {
  const [trace, setTrace] = useState<SimulationTrace | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlayingState] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const autoPlayRef = useRef(false)
  const playbackSpeedRef = useRef(1)

  const isActive = trace !== null
  const totalSteps = trace?.steps.length ?? 0
  const currentStepData = trace?.steps[currentStep]
  const currentNodeId = currentStepData?.node_id

  // Build edge lookup once when doc changes
  const edgeLookup = useMemo(() => (doc ? buildEdgeLookup(doc) : new Map<string, string>()), [doc])

  // Pre-compute snapshots once when trace changes (Review #19/#25/#34)
  const snapshots = useMemo<TraceSnapshots | null>(() => {
    if (!trace) return null
    return buildTraceSnapshots(trace.steps, edgeLookup)
  }, [trace, edgeLookup])

  // O(1) lookup per step (Review #19)
  const nodeHighlights = snapshots?.highlights[currentStep] ?? emptyHighlights

  // Track step direction for particle animation
  const [isForwardStep, setIsForwardStep] = useState(false)

  const edgeHighlights: EdgeHighlightMap =
    snapshots?.edgeHighlights[currentStep] ?? emptyEdgeHighlightsMap
  const simulationAnimation: SimulationAnimationConfig = useMemo(
    () => ({
      isForwardStep,
      particleDurationMs: Math.max(400, 1200 / playbackSpeed),
    }),
    [isForwardStep, playbackSpeed],
  )

  const start = useCallback(
    (input: unknown, fixtures?: Record<string, unknown>) => {
      if (!doc) return
      const rulesData = convertRulesData(rulesDataMap)
      const options: SimulationOptions = { input, fixtures, rulesData }

      setError(null)

      // Review #8: .catch() handler for unhandled rejections
      simulateGraph(doc, options).then(
        (result) => {
          if (result.error) {
            setError(result.error)
            return
          }
          setTrace(result)
          setCurrentStep(0)
        },
        (err: unknown) => {
          setError(err instanceof Error ? err.message : String(err))
        },
      )
    },
    [doc, rulesDataMap],
  )

  const stop = useCallback(() => {
    setTrace(null)
    setCurrentStep(0)
    setIsAutoPlayingState(false)
    autoPlayRef.current = false
    setPlaybackSpeed(1)
    playbackSpeedRef.current = 1
    setIsForwardStep(false)
    setError(null)
  }, [])

  const stepForward = useCallback(() => {
    setIsForwardStep(true)
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const stepBack = useCallback(() => {
    setIsForwardStep(false)
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep((prev) => {
        const clamped = Math.max(0, Math.min(step, totalSteps - 1))
        setIsForwardStep(clamped > prev)
        return clamped
      })
    },
    [totalSteps],
  )

  const reset = useCallback(() => {
    setIsForwardStep(false)
    setCurrentStep(0)
    setIsAutoPlayingState(false)
    autoPlayRef.current = false
  }, [])

  const setAutoPlay = useCallback((enabled: boolean) => {
    setIsAutoPlayingState(enabled)
    autoPlayRef.current = enabled
  }, [])

  const handleSetPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed)
    playbackSpeedRef.current = speed
  }, [])

  // Review #22: chained setTimeout instead of setInterval for auto-play
  useEffect(() => {
    if (!isAutoPlaying || !trace) return

    let timeoutId: ReturnType<typeof setTimeout>
    const stepsLength = trace.steps.length

    function tick() {
      setIsForwardStep(true)
      setCurrentStep((prev) => {
        const next = prev + 1
        if (next >= stepsLength) {
          setIsAutoPlayingState(false)
          autoPlayRef.current = false
          return prev
        }
        // Schedule next tick — reads current speed via ref
        timeoutId = setTimeout(tick, 1500 / playbackSpeedRef.current)
        return next
      })
    }

    timeoutId = setTimeout(tick, 1500 / playbackSpeedRef.current)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isAutoPlaying, trace, playbackSpeed])

  return {
    isActive,
    trace,
    currentStep,
    totalSteps,
    currentNodeId,
    currentStepData,
    nodeHighlights,
    error,
    start,
    stop,
    stepForward,
    stepBack,
    goToStep,
    reset,
    setAutoPlay,
    isAutoPlaying,
    playbackSpeed,
    setPlaybackSpeed: handleSetPlaybackSpeed,
    edgeHighlights,
    simulationAnimation,
  }
}
