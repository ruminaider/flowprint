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

interface EdgeLookups {
  /** "source->target" → first edge ID (for non-switch edges) */
  byPair: Map<string, string>
  /** "source:caseIndex" → edge ID (for switch case disambiguation) */
  byCase: Map<string, string>
}

const EMPTY_EDGE_LOOKUP: EdgeLookups = { byPair: new Map(), byCase: new Map() }

function edgeKey(source: string, target: string): string {
  return `${source}->${target}`
}

function caseKey(nodeId: string, caseIdx: number): string {
  return `${nodeId}:${String(caseIdx)}`
}

/**
 * Build lookups from schema edges to React Flow edge IDs.
 * Mirrors the ID pattern in layout-engine.ts: `e-${source}-${target}-${index}`
 */
function buildEdgeLookup(doc: FlowprintDocument): EdgeLookups {
  const schemaEdges = getEdges(doc)
  const byPair = new Map<string, string>()
  const byCase = new Map<string, string>()
  const caseCounters = new Map<string, number>()

  for (let i = 0; i < schemaEdges.length; i++) {
    const edge = schemaEdges[i]
    if (!edge) continue
    const edgeId = `e-${edge.source}-${edge.target}-${String(i)}`
    const key = edgeKey(edge.source, edge.target)

    if (!byPair.has(key)) {
      byPair.set(key, edgeId)
    }

    if (edge.label !== undefined) {
      const caseIdx = caseCounters.get(edge.source) ?? 0
      byCase.set(caseKey(edge.source, caseIdx), edgeId)
      caseCounters.set(edge.source, caseIdx + 1)
    }
  }

  return { byPair, byCase }
}

/**
 * Pre-compute highlight and context snapshots for every step index.
 * One-time O(n) pass when trace arrives, then O(1) access per step.
 * Each entry is a point-in-time snapshot (Review #36).
 */
function buildTraceSnapshots(
  steps: SimulationStep[],
  edgeLookup: EdgeLookups,
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
      if (prev.branchNodeIds) {
        for (const branchId of prev.branchNodeIds) {
          snapshot[branchId] = 'visited'
        }
      }
    }

    // Mark the incoming edge (previous → current) as traversing.
    // Skip edge animation for parallel "completed" steps — the hub was
    // already visited via the "entered" step, so re-animating an edge
    // into it would show the wrong visual.
    // Also skip for the join target (step after parallel "completed") — the
    // hub→join edge crosses over branch nodes, making the particle look wrong.
    const isParallelRevisit = step.type === 'parallel' && step.status === 'completed'
    const prevStep = i > 0 ? steps[i - 1] : undefined
    const isParallelJoin =
      prevStep?.type === 'parallel' && prevStep?.status === 'completed'
    if (i > 0 && !isParallelRevisit && !isParallelJoin && prevStep) {
      // Switch nodes can have multiple cases targeting the same node (e.g.
      // triage_assessment → assign_provider for both Urgent and Routine).
      // matched_case disambiguates which case edge to animate.
      let edgeId =
        prevStep.matched_case !== undefined
          ? edgeLookup.byCase.get(caseKey(prevStep.node_id, prevStep.matched_case))
          : undefined

      // Direct source→target lookup (handles single-edge paths)
      if (!edgeId) {
        edgeId = edgeLookup.byPair.get(edgeKey(prevStep.node_id, step.node_id))
      }

      // Intermediate routing (e.g. switch → hub → branch in parallel flows)
      if (!edgeId && prevStep.next && prevStep.next !== step.node_id) {
        edgeId = edgeLookup.byPair.get(edgeKey(prevStep.next, step.node_id))
      }

      // Defensive fallback: linear scan for any edge targeting this node
      if (!edgeId) {
        for (const [key, eid] of edgeLookup.byPair.entries()) {
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

    // Fan-out edges for parallel branches (all animate simultaneously)
    if (step.branchNodeIds) {
      for (const branchId of step.branchNodeIds) {
        const fanOutEdgeId = edgeLookup.byPair.get(edgeKey(step.node_id, branchId))
        if (fanOutEdgeId) edgeSnapshot[fanOutEdgeId] = 'traversing'
      }
    }

    // Previous step's node holds active appearance during particle transit
    if (i > 0) {
      const prevNode = steps[i - 1]
      if (prevNode && prevNode.status !== 'error') {
        snapshot[prevNode.node_id] = 'departing'
        if (prevNode.branchNodeIds) {
          for (const branchId of prevNode.branchNodeIds) {
            snapshot[branchId] = 'departing'
          }
        }
      }
    }

    // Mark current node
    snapshot[step.node_id] = step.status === 'error' ? 'error' : 'active'
    if (step.branchNodeIds) {
      for (const branchId of step.branchNodeIds) {
        snapshot[branchId] = 'active'
      }
    }

    highlights.push(snapshot)
    edgeHighlights.push(edgeSnapshot)

    // Build cumulative context
    if (step.stepOutput) {
      cumulativeCtx[step.stepOutput.nodeId] = step.stepOutput.value
    }
    if (step.branchOutputs) {
      for (const [branchId, value] of Object.entries(step.branchOutputs)) {
        cumulativeCtx[branchId] = value
      }
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
  const edgeLookup = useMemo<EdgeLookups>(
    () => (doc ? buildEdgeLookup(doc) : EMPTY_EDGE_LOOKUP),
    [doc],
  )

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
      stepKey: currentStep,
    }),
    [isForwardStep, playbackSpeed, currentStep],
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

  // Auto-play: automated step-through using the same stepForward() path as
  // manual stepping. This guarantees identical animation behavior.
  const stepForwardRef = useRef(stepForward)
  stepForwardRef.current = stepForward
  const currentStepRef = useRef(currentStep)
  currentStepRef.current = currentStep

  useEffect(() => {
    if (!isAutoPlaying || !trace) return

    let timeoutId: ReturnType<typeof setTimeout>
    const stepsLength = trace.steps.length

    function stepInterval(): number {
      const speed = playbackSpeedRef.current
      const particleDur = Math.max(400, 1200 / speed)
      const glowSettleMs = 500 // 300ms CSS transition + 200ms visible glow
      return particleDur + glowSettleMs
    }

    function tick() {
      if (currentStepRef.current + 1 >= stepsLength) {
        setIsAutoPlayingState(false)
        autoPlayRef.current = false
        return
      }
      stepForwardRef.current()
      timeoutId = setTimeout(tick, stepInterval())
    }

    timeoutId = setTimeout(tick, stepInterval())

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isAutoPlaying, trace])

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
