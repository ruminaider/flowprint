import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { simulateGraph } from '@ruminaider/flowprint-engine/browser'
import type {
  SimulationTrace,
  SimulationStep,
  SimulationOptions,
  RulesDocument,
} from '@ruminaider/flowprint-engine/browser'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { NodeHighlightMap } from '@ruminaider/flowprint-editor'
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
}

interface TraceSnapshots {
  highlights: NodeHighlightMap[]
  contexts: Record<string, unknown>[]
}

/**
 * Pre-compute highlight and context snapshots for every step index.
 * One-time O(n) pass when trace arrives, then O(1) access per step.
 * Each entry is a point-in-time snapshot (Review #36).
 */
function buildTraceSnapshots(steps: SimulationStep[]): TraceSnapshots {
  const highlights: NodeHighlightMap[] = []
  const contexts: Record<string, unknown>[] = []
  const cumulativeCtx: Record<string, unknown> = {}

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    const snapshot: NodeHighlightMap = {}

    // Mark all previously visited nodes
    for (let j = 0; j < i; j++) {
      const prev = steps[j]
      if (!prev) continue
      snapshot[prev.node_id] = prev.status === 'error' ? 'error' : 'visited'
    }

    // Mark current node
    snapshot[step.node_id] = step.status === 'error' ? 'error' : 'active'

    highlights.push(snapshot)

    // Build cumulative context
    if (step.stepOutput) {
      cumulativeCtx[step.stepOutput.nodeId] = step.stepOutput.value
    }
    contexts.push({ ...cumulativeCtx })
  }

  return { highlights, contexts }
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

export function useSimulation(
  doc: FlowprintDocument | null,
  rulesDataMap: RulesDataMap,
): UseSimulationReturn {
  const [trace, setTrace] = useState<SimulationTrace | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAutoPlaying, setIsAutoPlayingState] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoPlayRef = useRef(false)

  const isActive = trace !== null
  const totalSteps = trace?.steps.length ?? 0
  const currentStepData = trace?.steps[currentStep]
  const currentNodeId = currentStepData?.node_id

  // Pre-compute snapshots once when trace changes (Review #19/#25/#34)
  const snapshots = useMemo<TraceSnapshots | null>(() => {
    if (!trace) return null
    return buildTraceSnapshots(trace.steps)
  }, [trace])

  // O(1) lookup per step (Review #19)
  const nodeHighlights = snapshots?.highlights[currentStep] ?? emptyHighlights

  const start = useCallback(
    (input: unknown, fixtures?: Record<string, unknown>) => {
      if (!doc) return
      const rulesData = convertRulesData(rulesDataMap)
      const options: SimulationOptions = { input, fixtures, rulesData }

      setError(null)

      // Review #8: .catch() handler for unhandled rejections
      simulateGraph(doc, options).then(
        (result) => {
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
    setError(null)
  }, [])

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
  }, [totalSteps])

  const stepBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)))
    },
    [totalSteps],
  )

  const reset = useCallback(() => {
    setCurrentStep(0)
    setIsAutoPlayingState(false)
    autoPlayRef.current = false
  }, [])

  const setAutoPlay = useCallback((enabled: boolean) => {
    setIsAutoPlayingState(enabled)
    autoPlayRef.current = enabled
  }, [])

  // Review #22: chained setTimeout instead of setInterval for auto-play
  useEffect(() => {
    if (!isAutoPlaying || !trace) return

    let timeoutId: ReturnType<typeof setTimeout>
    const stepsLength = trace.steps.length

    function tick() {
      setCurrentStep((prev) => {
        const next = prev + 1
        if (next >= stepsLength) {
          setIsAutoPlayingState(false)
          autoPlayRef.current = false
          return prev
        }
        // Schedule next tick after completing this one
        timeoutId = setTimeout(tick, 1500)
        return next
      })
    }

    timeoutId = setTimeout(tick, 1500)

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
  }
}
