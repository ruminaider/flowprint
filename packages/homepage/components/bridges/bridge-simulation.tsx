'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import './bridge-simulation.css'
import '../flow/flow.css'

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

interface BridgeSimulationProps {
  perspective: 'business' | 'developer'
}

interface RippleObj {
  id: string
  cx: number
  cy: number
  color: string
  delay: number
}

type SimMode = 'walkthrough' | 'stepbystep' | 'whatif'

// ══════════════════════════════════════════════════════
// NODE & EDGE DEFINITIONS
// ══════════════════════════════════════════════════════

// Walk-through: Patient Intake — urgent path
const walkthroughPath = {
  nodes: ['wt-node-checkin', 'wt-node-verify', 'wt-node-assess', 'wt-node-priority', 'wt-node-emergprep', 'wt-node-review', 'wt-node-end'],
  edges: ['wt-edge-checkin-verify', 'wt-edge-verify-assess', 'wt-edge-assess-priority', 'wt-edge-priority-urgent-v', 'wt-edge-emergprep-review', 'wt-edge-review-end'],
  tooltips: [null, null, null, null, null, null, null] as (string | null)[],
  labels: ['Check In', 'Verify Insurance', 'Initial Assessment', 'Priority Rating', 'Emergency Prep', 'Doctor Review', 'End'],
}

// Step-by-step: Loan Application — approved path
const stepByStepPath = {
  nodes: ['sb-node-submit', 'sb-node-upload', 'sb-node-credit', 'sb-node-risk', 'sb-node-offer', 'sb-node-disburse', 'sb-node-end'],
  edges: ['sb-edge-submit-upload', 'sb-edge-upload-credit', 'sb-edge-credit-risk', 'sb-edge-risk-approved-v', 'sb-edge-offer-disburse', 'sb-edge-disburse-end'],
  tooltips: ['tt-sb-submit', 'tt-sb-upload', 'tt-sb-credit', 'tt-sb-risk', 'tt-sb-offer', 'tt-sb-disburse', 'tt-sb-end'],
  labels: ['Submit Application', 'Upload Documents', 'Credit Check', 'Risk Assessment', 'Generate Offer', 'Disburse Funds', 'End'],
}

// What-if Scenario A: Insurance Claim — approve path (green, happy)
const whatIfPathA = {
  nodes: ['wi-node-file', 'wi-node-evidence', 'wi-node-review', 'wi-node-assess', 'wi-node-payout', 'wi-node-issue', 'wi-node-end'],
  edges: ['wi-edge-file-evidence', 'wi-edge-evidence-review', 'wi-edge-review-assess', 'wi-edge-assess-approve-v', 'wi-edge-payout-issue', 'wi-edge-issue-end'],
  labels: ['File Claim', 'Submit Evidence', 'Review Claim', 'Assess Damage', 'Calculate Payout', 'Issue Payment', 'End'],
}

// What-if Scenario B: Insurance Claim — investigate path with Fraud Check ERROR
const whatIfPathB = {
  nodes: ['wi-node-file', 'wi-node-evidence', 'wi-node-review', 'wi-node-assess', 'wi-node-fraud'],
  edges: ['wi-edge-file-evidence', 'wi-edge-evidence-review', 'wi-edge-review-assess', 'wi-edge-assess-investigate-v'],
  labels: ['File Claim', 'Submit Evidence', 'Review Claim', 'Assess Damage', 'Fraud Check'],
}

const fileNames: Record<SimMode, string> = {
  walkthrough: 'patient-intake.flowprint',
  stepbystep: 'loan-application.flowprint',
  whatif: 'insurance-claim.flowprint',
}

// Node center positions (from data-cx, data-cy)
const nodeCenters: Record<string, { x: number; y: number }> = {
  'wt-node-checkin': { x: 200, y: 63 },
  'wt-node-verify': { x: 430, y: 63 },
  'wt-node-assess': { x: 490, y: 187 },
  'wt-node-priority': { x: 660, y: 187 },
  'wt-node-emergprep': { x: 600, y: 325 },
  'wt-node-review': { x: 310, y: 325 },
  'wt-node-schedule': { x: 780, y: 375 },
  'wt-node-end': { x: 130, y: 325 },
  'sb-node-submit': { x: 200, y: 58 },
  'sb-node-upload': { x: 430, y: 58 },
  'sb-node-credit': { x: 430, y: 182 },
  'sb-node-risk': { x: 640, y: 182 },
  'sb-node-offer': { x: 640, y: 320 },
  'sb-node-disburse': { x: 560, y: 380 },
  'sb-node-reject': { x: 780, y: 320 },
  'sb-node-manual': { x: 340, y: 320 },
  'sb-node-end': { x: 160, y: 380 },
  'wi-node-file': { x: 200, y: 58 },
  'wi-node-evidence': { x: 430, y: 58 },
  'wi-node-review': { x: 430, y: 182 },
  'wi-node-assess': { x: 640, y: 182 },
  'wi-node-payout': { x: 630, y: 325 },
  'wi-node-issue': { x: 320, y: 325 },
  'wi-node-end': { x: 130, y: 325 },
  'wi-node-fraud': { x: 780, y: 325 },
}

// ══════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════

export function BridgeSimulation({ perspective }: BridgeSimulationProps) {
  const [showDev, setShowDev] = useState(perspective === 'developer')
  const [currentMode, setCurrentMode] = useState<SimMode>('walkthrough')
  const [statusText, setStatusText] = useState('Simulating...')
  const [statusDotClass, setStatusDotClass] = useState('')
  const [activeSvg, setActiveSvg] = useState<SimMode>('walkthrough')
  const [stepControlsVisible, setStepControlsVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(-1)
  const [scenarioLabelText, setScenarioLabelText] = useState('')
  const [scenarioLabelClass, setScenarioLabelClass] = useState('')
  const [scenarioLabelVisible, setScenarioLabelVisible] = useState(false)
  const [errorTooltipVisible, setErrorTooltipVisible] = useState(false)

  // Node/edge class states
  const [nodeClasses, setNodeClasses] = useState<Record<string, string>>({})
  const [edgeClasses, setEdgeClasses] = useState<Record<string, string>>({})
  const [tooltipVisible, setTooltipVisible] = useState<Record<string, boolean>>({})

  // Ripple state
  const [wtRipples, setWtRipples] = useState<RippleObj[]>([])
  const [sbRipples, setSbRipples] = useState<RippleObj[]>([])
  const [wiRipples, setWiRipples] = useState<RippleObj[]>([])

  // Fraud node visibility
  const [fraudNodeStyle, setFraudNodeStyle] = useState<React.CSSProperties>({
    opacity: 0,
    transformOrigin: '780px 325px',
    transform: 'scale(0)',
  })
  const [fraudNodeRectStyle, setFraudNodeRectStyle] = useState<React.CSSProperties>({
    stroke: 'rgba(255,146,67,0.3)',
  })
  // Investigate edges/label visibility
  const [investigateEdgesOpacity, setInvestigateEdgesOpacity] = useState(0)
  const [investigateLabelOpacity, setInvestigateLabelOpacity] = useState(0)

  // Developer terminal
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set())

  // Timer refs
  const animationTimers = useRef<number[]>([])
  const devAnimTimers = useRef<number[]>([])
  const rippleIdCounter = useRef(0)
  const currentViewRef = useRef<'business' | 'developer'>(perspective === 'developer' ? 'developer' : 'business')
  const currentModeRef = useRef<SimMode>('walkthrough')
  const stepIndexRef = useRef(-1)

  // Dynamic height refs
  const containerRef = useRef<HTMLDivElement>(null)
  const bizViewRef = useRef<HTMLDivElement>(null)
  const devViewRef = useRef<HTMLDivElement>(null)
  const initialRender = useRef(true)

  // Sync showDev with parent perspective prop and trigger animations
  const hasInitialized = useRef(false)
  useEffect(() => {
    const isDev = perspective === 'developer'
    setShowDev(isDev)
    currentViewRef.current = isDev ? 'developer' : 'business'

    // Skip animation trigger on initial mount (handled by INIT effect)
    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }

    if (isDev) {
      stopAllAnimations()
      setTimeout(() => startDevAnimation(), 0)
    } else {
      stopDevAnimation()
      startSimulation(currentModeRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspective])

  // Dynamic height: measure active view and set container height
  useEffect(() => {
    const activeView = showDev ? devViewRef.current : bizViewRef.current
    if (!activeView || !containerRef.current) return
    const h = activeView.scrollHeight
    if (initialRender.current) {
      containerRef.current.style.transition = 'none'
      containerRef.current.style.height = `${h}px`
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = ''
        }
      })
      initialRender.current = false
    } else {
      containerRef.current.style.height = `${h}px`
    }
  }, [showDev])

  // Keep refs in sync
  useEffect(() => {
    currentViewRef.current = showDev ? 'developer' : 'business'
  }, [showDev])

  useEffect(() => {
    currentModeRef.current = currentMode
  }, [currentMode])

  useEffect(() => {
    stepIndexRef.current = stepIndex
  }, [stepIndex])

  // ══════════════════════════════════════════════════════
  // TIMER HELPERS
  // ══════════════════════════════════════════════════════
  const addTimer = useCallback((fn: () => void, delay: number) => {
    const t = window.setTimeout(fn, delay)
    animationTimers.current.push(t)
    return t
  }, [])

  const clearTimers = useCallback(() => {
    animationTimers.current.forEach(t => clearTimeout(t))
    animationTimers.current = []
  }, [])

  const addDevTimer = useCallback((fn: () => void, delay: number) => {
    const t = window.setTimeout(fn, delay)
    devAnimTimers.current.push(t)
    return t
  }, [])

  const clearDevTimers = useCallback(() => {
    devAnimTimers.current.forEach(t => clearTimeout(t))
    devAnimTimers.current = []
  }, [])

  // ══════════════════════════════════════════════════════
  // RIPPLE EFFECT
  // ══════════════════════════════════════════════════════
  const spawnRipple = useCallback((cx: number, cy: number, color: string, mode: SimMode) => {
    const newRipples: RippleObj[] = []
    for (let i = 0; i < 3; i++) {
      const id = `ripple-${rippleIdCounter.current++}`
      newRipples.push({ id, cx, cy, color, delay: i * 0.2 })
    }

    const setter =
      mode === 'walkthrough' ? setWtRipples :
      mode === 'stepbystep' ? setSbRipples :
      setWiRipples

    setter(prev => [...prev, ...newRipples])

    // Remove ripples after animation completes
    newRipples.forEach((r, i) => {
      addTimer(() => {
        setter(prev => prev.filter(p => p.id !== r.id))
      }, 1400 + i * 200)
    })
  }, [addTimer])

  // ══════════════════════════════════════════════════════
  // RESET
  // ══════════════════════════════════════════════════════
  const hideFraudNode = useCallback(() => {
    setFraudNodeStyle({
      opacity: 0,
      transformOrigin: '780px 325px',
      transform: 'scale(0)',
    })
    setFraudNodeRectStyle({ stroke: 'rgba(255,146,67,0.3)' })
  }, [])

  const hideInvestigateEdges = useCallback(() => {
    setInvestigateEdgesOpacity(0)
    setInvestigateLabelOpacity(0)
  }, [])

  const resetAllSvgStates = useCallback(() => {
    setNodeClasses({})
    setEdgeClasses({})
    setTooltipVisible({})
    setWtRipples([])
    setSbRipples([])
    setWiRipples([])
    setScenarioLabelVisible(false)
    setScenarioLabelClass('')
    setStepControlsVisible(false)
    setStatusDotClass('')
    setErrorTooltipVisible(false)
    hideFraudNode()
    hideInvestigateEdges()
  }, [hideFraudNode, hideInvestigateEdges])

  const stopAllAnimations = useCallback(() => {
    clearTimers()
    resetAllSvgStates()
  }, [clearTimers, resetAllSvgStates])

  // ══════════════════════════════════════════════════════
  // MODE 1: WALK-THROUGH
  // ══════════════════════════════════════════════════════
  const runWalkthrough = useCallback(() => {
    const path = walkthroughPath
    const delay = 500
    const totalDuration = path.nodes.length * delay + 1500

    path.nodes.forEach((nodeId, i) => {
      addTimer(() => {
        setNodeClasses(prev => {
          const next = { ...prev }
          if (i > 0) {
            next[path.nodes[i - 1]] = 'visited'
          }
          next[nodeId] = 'active'
          return next
        })

        if (i > 0 && path.edges[i - 1]) {
          setEdgeClasses(prev => ({
            ...prev,
            [path.edges[i - 1]]: 'visited-edge',
          }))
        }
        if (path.edges[i]) {
          setEdgeClasses(prev => ({
            ...prev,
            [path.edges[i]]: 'active-edge',
          }))
        }

        const center = nodeCenters[nodeId]
        if (center) spawnRipple(center.x, center.y, '#3FDC77', 'walkthrough')

        setStatusText(`Walking: ${path.labels[i]} \u2022 ${i + 1}/${path.nodes.length} nodes`)
      }, i * delay)
    })

    // Mark last node as visited
    addTimer(() => {
      const lastNode = path.nodes[path.nodes.length - 1]
      setNodeClasses(prev => ({ ...prev, [lastNode]: 'visited' }))
      const lastEdge = path.edges[path.edges.length - 1]
      if (lastEdge) {
        setEdgeClasses(prev => ({ ...prev, [lastEdge]: 'visited-edge' }))
      }
      setStatusText(`Walking: complete \u2022 ${path.nodes.length}/${path.nodes.length} nodes`)
    }, path.nodes.length * delay)

    // Loop
    addTimer(() => {
      if (currentViewRef.current === 'business' && currentModeRef.current === 'walkthrough') {
        resetAllSvgStates()
        setActiveSvg('walkthrough')
        // Need to re-run after reset
        setTimeout(() => {
          runWalkthrough()
        }, 0)
      }
    }, totalDuration)
  }, [addTimer, spawnRipple, resetAllSvgStates])

  // ══════════════════════════════════════════════════════
  // MODE 2: STEP-BY-STEP
  // ══════════════════════════════════════════════════════
  const stepForward = useCallback(() => {
    const path = stepByStepPath
    const idx = stepIndexRef.current

    if (idx >= path.nodes.length - 1) return

    // Transition current node from debug-active to visited
    if (idx >= 0) {
      setNodeClasses(prev => ({ ...prev, [path.nodes[idx]]: 'visited' }))
      if (path.tooltips[idx]) {
        setTooltipVisible(prev => ({ ...prev, [path.tooltips[idx]!]: false }))
      }
      if (path.edges[idx]) {
        setEdgeClasses(prev => ({ ...prev, [path.edges[idx]]: 'debug-visited-edge' }))
      }
    }

    const newIdx = idx + 1
    stepIndexRef.current = newIdx
    setStepIndex(newIdx)

    // Activate new node
    setNodeClasses(prev => ({ ...prev, [path.nodes[newIdx]]: 'debug-active' }))

    // Spawn ripple
    const center = nodeCenters[path.nodes[newIdx]]
    if (center) spawnRipple(center.x, center.y, '#3FDC77', 'stepbystep')

    // Show tooltip
    if (path.tooltips[newIdx]) {
      setTooltipVisible(prev => ({ ...prev, [path.tooltips[newIdx]!]: true }))
    }

    // Activate leading edge
    if (path.edges[newIdx]) {
      setEdgeClasses(prev => ({ ...prev, [path.edges[newIdx]]: 'debug-edge' }))
    }

    // Update status
    const nodeName = path.labels[newIdx]
    setStatusText(`Step ${newIdx + 1} of ${path.nodes.length} \u2022 ${nodeName}`)
  }, [spawnRipple])

  const stepBackward = useCallback(() => {
    const path = stepByStepPath
    const idx = stepIndexRef.current

    if (idx <= 0) return

    // Remove current node activation
    setNodeClasses(prev => {
      const next = { ...prev }
      delete next[path.nodes[idx]]
      return next
    })
    if (path.tooltips[idx]) {
      setTooltipVisible(prev => ({ ...prev, [path.tooltips[idx]!]: false }))
    }
    if (path.edges[idx]) {
      setEdgeClasses(prev => {
        const next = { ...prev }
        delete next[path.edges[idx]]
        return next
      })
    }

    const newIdx = idx - 1
    stepIndexRef.current = newIdx
    setStepIndex(newIdx)

    // Re-activate previous node
    setNodeClasses(prev => ({ ...prev, [path.nodes[newIdx]]: 'debug-active' }))
    if (path.tooltips[newIdx]) {
      setTooltipVisible(prev => ({ ...prev, [path.tooltips[newIdx]!]: true }))
    }
    if (path.edges[newIdx]) {
      setEdgeClasses(prev => ({ ...prev, [path.edges[newIdx]]: 'debug-edge' }))
    }

    const nodeName = path.labels[newIdx]
    setStatusText(`Step ${newIdx + 1} of ${path.nodes.length} \u2022 ${nodeName}`)
  }, [])

  const initStepByStep = useCallback(() => {
    stepIndexRef.current = -1
    setStepIndex(-1)
    setStepControlsVisible(true)
    setStatusDotClass('paused')
    setStatusText('Step-by-step \u2022 click Next to begin')
    // Auto-advance to first step
    setTimeout(() => stepForward(), 0)
  }, [stepForward])

  // ══════════════════════════════════════════════════════
  // MODE 3: WHAT-IF
  // ══════════════════════════════════════════════════════
  const showFraudNodeFn = useCallback((callback?: () => void) => {
    // Animate the node appearing
    setFraudNodeStyle({
      opacity: 1,
      transformOrigin: '780px 325px',
      transform: 'scale(1)',
      transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    })

    // Green glow on new node
    setFraudNodeRectStyle({
      stroke: '#3FDC77',
      filter: 'drop-shadow(0 0 12px rgba(63, 220, 119, 0.5))',
      transition: 'all 0.6s ease',
    })

    // Fade in edges and label
    addTimer(() => {
      setInvestigateEdgesOpacity(1)
      setInvestigateLabelOpacity(1)
    }, 300)

    // Pulse the green glow
    let pulseCount = 0
    const pulseInterval = window.setInterval(() => {
      if (pulseCount >= 3) {
        clearInterval(pulseInterval)
        setFraudNodeRectStyle({ stroke: 'rgba(255,146,67,0.3)' })
        if (callback) callback()
        return
      }
      const bright = pulseCount % 2 === 0
      setFraudNodeRectStyle({
        stroke: '#3FDC77',
        filter: bright
          ? 'drop-shadow(0 0 16px rgba(63, 220, 119, 0.7))'
          : 'drop-shadow(0 0 8px rgba(63, 220, 119, 0.3))',
        transition: 'all 0.6s ease',
      })
      pulseCount++
    }, 400)

    // Store interval for cleanup
    animationTimers.current.push(pulseInterval as unknown as number)
  }, [addTimer])

  const runScenarioBPath = useCallback((
    path: typeof whatIfPathB,
    delay: number,
    onDone?: () => void,
  ) => {
    const startDelay = 800

    path.nodes.forEach((nodeId, i) => {
      addTimer(() => {
        const isLast = i === path.nodes.length - 1
        const isError = isLast

        if (i > 0) {
          setNodeClasses(prev => ({ ...prev, [path.nodes[i - 1]]: 'visited' }))
          if (path.edges[i - 1]) {
            setEdgeClasses(prev => ({ ...prev, [path.edges[i - 1]]: 'visited-edge' }))
          }
        }

        if (isError) {
          // ERROR STATE
          setNodeClasses(prev => ({ ...prev, [nodeId]: 'active-error' }))

          // Red ripple
          const center = nodeCenters[nodeId]
          if (center) {
            spawnRipple(center.x, center.y, '#FF362B', 'whatif')
            addTimer(() => spawnRipple(center.x, center.y, '#FF362B', 'whatif'), 300)
            addTimer(() => spawnRipple(center.x, center.y, '#FF362B', 'whatif'), 600)
          }

          // Show error tooltip
          addTimer(() => {
            setErrorTooltipVisible(true)
          }, 200)

          // Update status to error
          setStatusDotClass('error')
          setStatusText('Scenario B \u2022 ERROR at Fraud Check')
          setScenarioLabelText('Scenario B: + Fraud Detection \u2192 Alert detected')
        } else {
          setNodeClasses(prev => ({ ...prev, [nodeId]: 'active' }))
          const center = nodeCenters[nodeId]
          if (center) spawnRipple(center.x, center.y, '#3FDC77', 'whatif')

          if (path.edges[i]) {
            setEdgeClasses(prev => ({ ...prev, [path.edges[i]]: 'active-edge' }))
          }

          setStatusText(`Scenario B \u2022 ${path.labels[i]} \u2022 ${i + 1}/${path.nodes.length}`)
        }
      }, startDelay + i * delay)
    })

    // Hold on error state for 3 seconds
    const totalTime = startDelay + path.nodes.length * delay
    addTimer(() => {
      if (onDone) onDone()
    }, totalTime + 3000)
  }, [addTimer, spawnRipple])

  const runWhatIfScenarioB = useCallback((onDone?: () => void) => {
    const path = whatIfPathB
    const delay = 500

    // Reset graph state
    resetAllSvgStates()
    setActiveSvg('whatif')

    setScenarioLabelText('Scenario B: + Fraud Detection')
    setScenarioLabelClass('scenario-b')
    setScenarioLabelVisible(true)

    // First: morph in the fraud check node
    addTimer(() => {
      setStatusText('Adding Fraud Check node...')
      showFraudNodeFn(() => {
        // Now run the path through to the error
        runScenarioBPath(path, delay, onDone)
      })
    }, 400)
  }, [addTimer, resetAllSvgStates, showFraudNodeFn, runScenarioBPath])

  const runWhatIfScenarioA = useCallback((onDone?: () => void) => {
    const path = whatIfPathA
    const delay = 450

    setScenarioLabelText('Scenario A: Normal Claim')
    setScenarioLabelClass('scenario-a')
    setScenarioLabelVisible(true)

    path.nodes.forEach((nodeId, i) => {
      addTimer(() => {
        if (i > 0) {
          setNodeClasses(prev => ({ ...prev, [path.nodes[i - 1]]: 'visited' }))
          if (path.edges[i - 1]) {
            setEdgeClasses(prev => ({ ...prev, [path.edges[i - 1]]: 'visited-edge' }))
          }
        }

        setNodeClasses(prev => ({ ...prev, [nodeId]: 'active' }))

        const center = nodeCenters[nodeId]
        if (center) spawnRipple(center.x, center.y, '#3FDC77', 'whatif')

        if (path.edges[i]) {
          setEdgeClasses(prev => ({ ...prev, [path.edges[i]]: 'active-edge' }))
        }

        setStatusText(`Scenario A \u2022 ${path.labels[i]} \u2022 ${i + 1}/${path.nodes.length}`)
      }, i * delay)
    })

    const totalTime = path.nodes.length * delay

    addTimer(() => {
      const lastNode = path.nodes[path.nodes.length - 1]
      setNodeClasses(prev => ({ ...prev, [lastNode]: 'visited' }))
      const lastEdge = path.edges[path.edges.length - 1]
      if (lastEdge) {
        setEdgeClasses(prev => ({ ...prev, [lastEdge]: 'visited-edge' }))
      }
      setStatusText('Scenario A \u2022 All nodes passed')
    }, totalTime)

    // Brief pause then callback
    addTimer(() => {
      if (onDone) onDone()
    }, totalTime + 1500)
  }, [addTimer, spawnRipple])

  const runWhatIf = useCallback(() => {
    runWhatIfScenarioA(() => {
      if (currentViewRef.current !== 'business' || currentModeRef.current !== 'whatif') return

      runWhatIfScenarioB(() => {
        // Loop back to start after error hold
        if (currentViewRef.current === 'business' && currentModeRef.current === 'whatif') {
          addTimer(() => {
            if (currentViewRef.current === 'business' && currentModeRef.current === 'whatif') {
              resetAllSvgStates()
              setActiveSvg('whatif')
              setTimeout(() => runWhatIf(), 0)
            }
          }, 500)
        }
      })
    })
  }, [addTimer, resetAllSvgStates, runWhatIfScenarioA, runWhatIfScenarioB])

  // ══════════════════════════════════════════════════════
  // DEVELOPER VIEW ANIMATION
  // ══════════════════════════════════════════════════════
  const stopDevAnimation = useCallback(() => {
    clearDevTimers()
    setRevealedLines(new Set())
  }, [clearDevTimers])

  const startDevAnimation = useCallback(() => {
    stopDevAnimation()

    const delays = [0, 200, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300]

    delays.forEach((d, i) => {
      addDevTimer(() => {
        setRevealedLines(prev => new Set([...prev, i]))
      }, d)
    })

    addDevTimer(() => {
      if (currentViewRef.current === 'developer') {
        stopDevAnimation()
        setTimeout(() => startDevAnimation(), 0)
      }
    }, 5500)
  }, [addDevTimer, stopDevAnimation])

  // ══════════════════════════════════════════════════════
  // SIMULATION CONTROLLER
  // ══════════════════════════════════════════════════════
  const startSimulation = useCallback((mode: SimMode) => {
    resetAllSvgStates()
    clearTimers()
    setActiveSvg(mode)

    // Use setTimeout(0) to ensure state updates from resetAllSvgStates have been applied
    setTimeout(() => {
      switch (mode) {
        case 'walkthrough':
          runWalkthrough()
          break
        case 'stepbystep':
          initStepByStep()
          break
        case 'whatif':
          runWhatIf()
          break
      }
    }, 0)
  }, [resetAllSvgStates, clearTimers, runWalkthrough, initStepByStep, runWhatIf])

  // ══════════════════════════════════════════════════════
  // VIEW TOGGLE HANDLERS
  // ══════════════════════════════════════════════════════
  const handleShowDev = useCallback(() => {
    setShowDev(true)
    currentViewRef.current = 'developer'
    stopAllAnimations()
    setTimeout(() => startDevAnimation(), 0)
  }, [stopAllAnimations, startDevAnimation])

  const handleShowBusiness = useCallback(() => {
    setShowDev(false)
    currentViewRef.current = 'business'
    stopDevAnimation()
    startSimulation(currentModeRef.current)
  }, [stopDevAnimation, startSimulation])

  // ══════════════════════════════════════════════════════
  // PILL TAB HANDLER
  // ══════════════════════════════════════════════════════
  const handleTabClick = useCallback((mode: SimMode) => {
    setCurrentMode(mode)
    currentModeRef.current = mode
    stopAllAnimations()
    startSimulation(mode)
  }, [stopAllAnimations, startSimulation])

  // ══════════════════════════════════════════════════════
  // KEYBOARD SUPPORT
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentModeRef.current !== 'stepbystep' || currentViewRef.current !== 'business') return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        stepForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepBackward()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [stepForward, stepBackward])

  // ══════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    if (perspective === 'developer') {
      startDevAnimation()
    } else {
      startSimulation('walkthrough')
    }

    return () => {
      // Cleanup ALL timeouts
      animationTimers.current.forEach(t => clearTimeout(t))
      devAnimTimers.current.forEach(t => clearTimeout(t))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ══════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════
  const getNodeClassName = (id: string) => {
    const cls = nodeClasses[id]
    return cls ? ` ${cls}` : ''
  }

  const getEdgeClassName = (id: string) => {
    const cls = edgeClasses[id]
    return cls ? ` ${cls}` : ''
  }

  const isTooltipVisible = (id: string) => !!tooltipVisible[id]

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div ref={containerRef} className={`bridge-simulation${showDev ? ' show-dev' : ''}`} style={{ position: 'relative', width: 780, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 80px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.04)', overflow: 'hidden', transition: 'height 0.5s cubic-bezier(0.23, 1, 0.32, 1)' }}>

      {/* ===== BUSINESS VIEW ===== */}
      <div ref={bizViewRef} className="view view--business">
        <div className="layer-badge layer-badge--business">
          <span className="dot"></span>
          Business Perspective
        </div>

        <h2 className="card-title">Simulation &amp; Testing</h2>
        <p className="card-description">
          Test every path before it goes live. No technical skills needed.
        </p>

        {/* Pill tabs */}
        <div className="pill-tabs">
          <button
            className={`pill-tab${currentMode === 'walkthrough' ? ' active' : ''}`}
            onClick={() => handleTabClick('walkthrough')}
          >
            Walk-through
          </button>
          <button
            className={`pill-tab${currentMode === 'stepbystep' ? ' active' : ''}`}
            onClick={() => handleTabClick('stepbystep')}
          >
            Step-by-step
          </button>
          <button
            className={`pill-tab${currentMode === 'whatif' ? ' active' : ''}`}
            onClick={() => handleTabClick('whatif')}
          >
            What-if
          </button>
        </div>

        {/* Flow diagram */}
        <div className="flow-container">
          <div className="flow-panel-header">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="#6b5a4d"/>
            </svg>
            <span>{fileNames[currentMode]}</span>
            <div className="header-dot"></div>
          </div>
          <div className="flow-panel-body">
            {/* Scenario label overlay for what-if mode */}
            <div className={`scenario-label${scenarioLabelVisible ? ' visible' : ''} ${scenarioLabelClass}`}>
              {scenarioLabelText}
            </div>

            {/* ══════════════════════════════════════════════════════
                 SVG 1: WALK-THROUGH — Patient Intake (Healthcare)
                 ══════════════════════════════════════════════════════ */}
            <svg className={`flow-svg${activeSvg === 'walkthrough' ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="wt-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40"/>
                </marker>
                <marker id="wt-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77"/>
                </marker>
              </defs>

              {/* Lane backgrounds */}
              <rect className="lane-bg-rect" x="4" y="4" width="892" height="118" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="128" width="892" height="118" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="252" width="892" height="144" rx="8"/>

              {/* Lane labels */}
              <text className="lane-label" x="16" y="68">RECEPTION</text>
              <text className="lane-label" x="16" y="192">TRIAGE</text>
              <text className="lane-label" x="16" y="328">CLINICAL</text>

              {/* ALL edges */}
              <line className={`edge${getEdgeClassName('wt-edge-checkin-verify')}`} x1="238" y1="63" x2="390" y2="63" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-verify-assess')}`} x1="430" y1="78" x2="490" y2="172" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-assess-priority')}`} x1="536" y1="187" x2="620" y2="187" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-priority-urgent-v')}`} x1="660" y1="202" x2="640" y2="310" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-priority-routine-h')}`} x1="700" y1="187" x2="780" y2="187"/>
              <line className={`edge${getEdgeClassName('wt-edge-priority-routine-v')}`} x1="780" y1="187" x2="780" y2="360" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-emergprep-review')}`} x1="560" y1="325" x2="350" y2="325" markerEnd="url(#wt-arrow)"/>
              <line className={`edge${getEdgeClassName('wt-edge-review-end')}`} x1="270" y1="325" x2="143" y2="325" markerEnd="url(#wt-arrow)"/>
              <path className={`edge${getEdgeClassName('wt-edge-sched-end-h')}`} d="M737 375 L130 375 L130 338" markerEnd="url(#wt-arrow)"/>

              {/* Edge labels */}
              <text className="edge-label" x="665" y="255">urgent</text>
              <text className="edge-label" x="720" y="180">routine</text>

              {/* ALL nodes */}
              {/* Check In (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-checkin')}`} data-cx="200" data-cy="63" transform="translate(200,63)">
                <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Check In</text>
              </g>
              {/* Verify Insurance (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-verify')}`} data-cx="430" data-cy="63" transform="translate(430,63)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Verify Insurance</text>
              </g>
              {/* Initial Assessment (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-assess')}`} data-cx="490" data-cy="187" transform="translate(490,187)">
                <rect className="node-rect" x="-46" y="-15" width="92" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Initial Assessment</text>
              </g>
              {/* Priority Rating (switch) */}
              <g className={`node-group ntype-switch${getNodeClassName('wt-node-priority')}`} data-cx="660" data-cy="187" transform="translate(660,187)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
                <text className="node-label" x="0" y="6">Priority</text>
              </g>
              {/* Emergency Prep (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-emergprep')}`} data-cx="600" data-cy="325" transform="translate(600,325)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Emergency Prep</text>
              </g>
              {/* Doctor Review (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-review')}`} data-cx="310" data-cy="325" transform="translate(310,325)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Doctor Review</text>
              </g>
              {/* Schedule Appointment (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wt-node-schedule')}`} data-cx="780" data-cy="375" transform="translate(780,375)">
                <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Schedule Appt</text>
              </g>
              {/* End (terminal) */}
              <g className={`node-group ntype-terminal${getNodeClassName('wt-node-end')}`} data-cx="130" data-cy="325" transform="translate(130,325)">
                <circle className="node-circle" cx="0" cy="0" r="13"/>
                <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
              </g>

              {/* Ripple layer */}
              <g>
                {wtRipples.map(r => (
                  <circle
                    key={r.id}
                    className="ripple-circle"
                    cx={r.cx}
                    cy={r.cy}
                    r="4"
                    stroke={r.color}
                    style={{ animation: `bridge-sim-ripple-expand 1.2s ${r.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards` }}
                  />
                ))}
              </g>
            </svg>

            {/* ══════════════════════════════════════════════════════
                 SVG 2: STEP-BY-STEP — Loan Application (Finance)
                 ══════════════════════════════════════════════════════ */}
            <svg className={`flow-svg${activeSvg === 'stepbystep' ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="sb-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40"/>
                </marker>
                <marker id="sb-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77"/>
                </marker>
              </defs>

              {/* Lane backgrounds */}
              <rect className="lane-bg-rect" x="4" y="4" width="892" height="108" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="118" width="892" height="128" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="252" width="892" height="144" rx="8"/>

              {/* Lane labels */}
              <text className="lane-label" x="16" y="62">APPLICANT</text>
              <text className="lane-label" x="16" y="186">UNDERWRITING</text>
              <text className="lane-label" x="16" y="328">OPERATIONS</text>

              {/* ALL edges */}
              <line className={`edge${getEdgeClassName('sb-edge-submit-upload')}`} x1="245" y1="58" x2="385" y2="58" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-upload-credit')}`} x1="430" y1="73" x2="430" y2="167" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-credit-risk')}`} x1="468" y1="182" x2="600" y2="182" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-risk-approved-v')}`} x1="640" y1="197" x2="640" y2="305" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-risk-denied-h')}`} x1="680" y1="182" x2="780" y2="182"/>
              <line className={`edge${getEdgeClassName('sb-edge-risk-denied-v')}`} x1="780" y1="182" x2="780" y2="305" markerEnd="url(#sb-arrow)"/>
              <path className={`edge${getEdgeClassName('sb-edge-risk-review-h')}`} d="M600 197 L480 250 L340 250"/>
              <line className={`edge${getEdgeClassName('sb-edge-risk-review-v')}`} x1="340" y1="250" x2="340" y2="305" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-offer-disburse')}`} x1="640" y1="335" x2="560" y2="365" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-disburse-end')}`} x1="517" y1="380" x2="173" y2="380" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-reject-end-h')}`} x1="780" y1="335" x2="780" y2="380"/>
              <line className={`edge${getEdgeClassName('sb-edge-reject-end-v')}`} x1="780" y1="380" x2="173" y2="380" markerEnd="url(#sb-arrow)"/>
              <path className={`edge${getEdgeClassName('sb-edge-manual-risk-v')}`} d="M300 305 L300 155 L640 155 L640 167" markerEnd="url(#sb-arrow)"/>
              <line className={`edge${getEdgeClassName('sb-edge-manual-risk-h')}`} x1="0" y1="0" x2="0" y2="0" style={{ opacity: 0 }}/>

              {/* Edge labels */}
              <text className="edge-label" x="645" y="255">approved</text>
              <text className="edge-label" x="720" y="170">denied</text>
              <text className="edge-label" x="460" y="242">review</text>

              {/* ALL nodes */}
              {/* Submit Application (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-submit')}`} data-cx="200" data-cy="58" transform="translate(200,58)">
                <rect className="node-rect" x="-45" y="-15" width="90" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Submit Application</text>
              </g>
              {/* Upload Documents (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-upload')}`} data-cx="430" data-cy="58" transform="translate(430,58)">
                <rect className="node-rect" x="-45" y="-15" width="90" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Upload Documents</text>
              </g>
              {/* Credit Check (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-credit')}`} data-cx="430" data-cy="182" transform="translate(430,182)">
                <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Credit Check</text>
              </g>
              {/* Risk Assessment (switch) */}
              <g className={`node-group ntype-switch${getNodeClassName('sb-node-risk')}`} data-cx="640" data-cy="182" transform="translate(640,182)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
                <text className="node-label" x="0" y="6">Risk</text>
              </g>
              {/* Generate Offer (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-offer')}`} data-cx="640" data-cy="320" transform="translate(640,320)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Generate Offer</text>
              </g>
              {/* Disburse Funds (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-disburse')}`} data-cx="560" data-cy="380" transform="translate(560,380)">
                <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Disburse Funds</text>
              </g>
              {/* Send Rejection (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-reject')}`} data-cx="780" data-cy="320" transform="translate(780,320)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Send Rejection</text>
              </g>
              {/* Manual Review (action) */}
              <g className={`node-group ntype-action${getNodeClassName('sb-node-manual')}`} data-cx="340" data-cy="320" transform="translate(340,320)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Manual Review</text>
              </g>
              {/* End (terminal) */}
              <g className={`node-group ntype-terminal${getNodeClassName('sb-node-end')}`} data-cx="160" data-cy="380" transform="translate(160,380)">
                <circle className="node-circle" cx="0" cy="0" r="13"/>
                <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
              </g>

              {/* Ripple layer */}
              <g>
                {sbRipples.map(r => (
                  <circle
                    key={r.id}
                    className="ripple-circle"
                    cx={r.cx}
                    cy={r.cy}
                    r="4"
                    stroke={r.color}
                    style={{ animation: `bridge-sim-ripple-expand 1.2s ${r.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards` }}
                  />
                ))}
              </g>

              {/* Data tooltips for step-by-step mode */}
              <g className={`data-tooltip${isTooltipVisible('tt-sb-submit') ? ' visible' : ''}`}>
                <rect x="130" y="14" width="180" height="28" rx="5"/>
                <text x="138" y="28"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ applicant: "Jane Doe" }`}</tspan></text>
                <text x="138" y="38"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ appId: "LN-8834" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-upload') ? ' visible' : ''}`}>
                <rect x="510" y="34" width="210" height="28" rx="5"/>
                <text x="518" y="48"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ docs: ["W2", "bank_stmt"] }`}</tspan></text>
                <text x="518" y="58"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ verified: true, score: 0.94 }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-credit') ? ' visible' : ''}`}>
                <rect x="500" y="157" width="210" height="28" rx="5"/>
                <text x="508" y="171"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ ssn: "***-**-4821" }`}</tspan></text>
                <text x="508" y="181"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ creditScore: 742, tier: "A" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-risk') ? ' visible' : ''}`}>
                <rect x="686" y="160" width="200" height="28" rx="5"/>
                <text x="694" y="174"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ score: 742, amount: $85K }`}</tspan></text>
                <text x="694" y="184"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ decision: "approved" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-offer') ? ' visible' : ''}`}>
                <rect x="700" y="296" width="185" height="28" rx="5"/>
                <text x="708" y="310"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ rate: 5.2%, term: 30yr }`}</tspan></text>
                <text x="708" y="320"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ offerId: "OFF-1192" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-disburse') ? ' visible' : ''}`}>
                <rect x="640" y="363" width="195" height="28" rx="5"/>
                <text x="648" y="377"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ amount: $85,000 }`}</tspan></text>
                <text x="648" y="387"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ txId: "ACH-5510", ok: true }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-reject') ? ' visible' : ''}`}>
                <rect x="710" y="270" width="170" height="28" rx="5"/>
                <text x="718" y="284"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ reason: "DTI > 43%" }`}</tspan></text>
                <text x="718" y="294"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ letter: "REJ-4410" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-manual') ? ' visible' : ''}`}>
                <rect x="270" y="270" width="190" height="28" rx="5"/>
                <text x="278" y="284"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ flag: "income_mismatch" }`}</tspan></text>
                <text x="278" y="294"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ override: "approve" }`}</tspan></text>
              </g>
              <g className={`data-tooltip${isTooltipVisible('tt-sb-end') ? ' visible' : ''}`}>
                <rect x="120" y="340" width="100" height="20" rx="5"/>
                <text x="128" y="353"><tspan className="tt-heading">status:</tspan> <tspan className="tt-val">disbursed</tspan></text>
              </g>
            </svg>

            {/* ══════════════════════════════════════════════════════
                 SVG 3: WHAT-IF — Insurance Claim
                 ══════════════════════════════════════════════════════ */}
            <svg className={`flow-svg${activeSvg === 'whatif' ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="wi-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40"/>
                </marker>
                <marker id="wi-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77"/>
                </marker>
                <marker id="wi-arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0.5, 8 3, 0 5.5" fill="#FF362B"/>
                </marker>
              </defs>

              {/* Lane backgrounds */}
              <rect className="lane-bg-rect" x="4" y="4" width="892" height="108" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="118" width="892" height="128" rx="8"/>
              <rect className="lane-bg-rect" x="4" y="252" width="892" height="144" rx="8"/>

              {/* Lane labels */}
              <text className="lane-label" x="16" y="62">CLAIMANT</text>
              <text className="lane-label" x="16" y="186">ADJUSTER</text>
              <text className="lane-label" x="16" y="328">SETTLEMENT</text>

              {/* ALL edges */}
              <line className={`edge${getEdgeClassName('wi-edge-file-evidence')}`} x1="238" y1="58" x2="390" y2="58" markerEnd="url(#wi-arrow)"/>
              <line className={`edge${getEdgeClassName('wi-edge-evidence-review')}`} x1="430" y1="73" x2="430" y2="167" markerEnd="url(#wi-arrow)"/>
              <line className={`edge${getEdgeClassName('wi-edge-review-assess')}`} x1="468" y1="182" x2="600" y2="182" markerEnd="url(#wi-arrow)"/>
              <line className={`edge${getEdgeClassName('wi-edge-assess-approve-v')}`} x1="630" y1="197" x2="630" y2="310" markerEnd="url(#wi-arrow)"/>
              <line className={`edge${getEdgeClassName('wi-edge-assess-investigate-h')}`} x1="680" y1="182" x2="780" y2="182" style={{ opacity: investigateEdgesOpacity, transition: 'opacity 0.4s ease' }}/>
              <line className={`edge${getEdgeClassName('wi-edge-assess-investigate-v')}`} x1="780" y1="182" x2="780" y2="310" markerEnd="url(#wi-arrow)" style={{ opacity: investigateEdgesOpacity, transition: 'opacity 0.4s ease' }}/>
              <line className={`edge${getEdgeClassName('wi-edge-payout-issue')}`} x1="587" y1="325" x2="360" y2="325" markerEnd="url(#wi-arrow)"/>
              <line className={`edge${getEdgeClassName('wi-edge-issue-end')}`} x1="280" y1="325" x2="143" y2="325" markerEnd="url(#wi-arrow)"/>

              {/* Edge labels */}
              <text className="edge-label" x="635" y="255">approve</text>
              <text className="edge-label" x="720" y="170" style={{ opacity: investigateLabelOpacity, transition: 'opacity 0.4s ease' }}>investigate</text>

              {/* ALL nodes */}
              {/* File Claim (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-file')}`} data-cx="200" data-cy="58" transform="translate(200,58)">
                <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">File Claim</text>
              </g>
              {/* Submit Evidence (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-evidence')}`} data-cx="430" data-cy="58" transform="translate(430,58)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Submit Evidence</text>
              </g>
              {/* Review Claim (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-review')}`} data-cx="430" data-cy="182" transform="translate(430,182)">
                <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Review Claim</text>
              </g>
              {/* Assess Damage (switch) */}
              <g className={`node-group ntype-switch${getNodeClassName('wi-node-assess')}`} data-cx="640" data-cy="182" transform="translate(640,182)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
                <text className="node-label" x="0" y="6">Assess</text>
              </g>
              {/* Calculate Payout (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-payout')}`} data-cx="630" data-cy="325" transform="translate(630,325)">
                <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Calculate Payout</text>
              </g>
              {/* Issue Payment (action) */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-issue')}`} data-cx="320" data-cy="325" transform="translate(320,325)">
                <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Issue Payment</text>
              </g>
              {/* End (terminal) */}
              <g className={`node-group ntype-terminal${getNodeClassName('wi-node-end')}`} data-cx="130" data-cy="325" transform="translate(130,325)">
                <circle className="node-circle" cx="0" cy="0" r="13"/>
                <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
              </g>
              {/* Fraud Check (action) — investigate path, hidden by default */}
              <g className={`node-group ntype-action${getNodeClassName('wi-node-fraud')}`} data-cx="780" data-cy="325" style={fraudNodeStyle} transform="translate(780,325)">
                <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={fraudNodeRectStyle}/>
                <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
                <text className="node-label" x="0" y="6">Fraud Check</text>
              </g>

              {/* Ripple layer */}
              <g>
                {wiRipples.map(r => (
                  <circle
                    key={r.id}
                    className="ripple-circle"
                    cx={r.cx}
                    cy={r.cy}
                    r="4"
                    stroke={r.color}
                    style={{ animation: `bridge-sim-ripple-expand 1.2s ${r.delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards` }}
                  />
                ))}
              </g>

              {/* Error tooltip for what-if mode */}
              <g className={`error-tooltip${errorTooltipVisible ? ' visible' : ''}`}>
                <rect x="660" y="348" width="250" height="22" rx="5"/>
                <text x="670" y="362"><tspan className="tt-icon">{'\u26A0'}</tspan> Alert: Suspicious pattern — duplicate claim #CLM-7829</text>
              </g>
            </svg>

          </div>

          {/* Step control bar */}
          <div className={`step-controls${stepControlsVisible ? ' visible' : ''}`}>
            <button
              className="step-btn"
              disabled={stepIndex <= 0}
              onClick={stepBackward}
            >
              {'\u2190'} Prev
            </button>
            <span className="step-indicator">
              {stepIndex < 0 ? 'Ready' : `Step ${stepIndex + 1} of ${stepByStepPath.nodes.length}`}
            </span>
            <button
              className="step-btn"
              disabled={stepIndex >= stepByStepPath.nodes.length - 1}
              onClick={stepForward}
            >
              Next {'\u2192'}
            </button>
          </div>

          <div className="flow-status">
            <div className={`status-dot${statusDotClass ? ` ${statusDotClass}` : ''}`}></div>
            <span>{statusText}</span>
            <span className="status-mode">
              {currentMode === 'walkthrough' ? 'walk-through' : currentMode === 'stepbystep' ? 'step-by-step' : 'what-if'}
            </span>
          </div>
        </div>

        <button className="cta" onClick={handleShowDev}>
          <span>See the developer view</span>
          <span className="cta-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

      {/* ===== DEVELOPER VIEW ===== */}
      <div ref={devViewRef} className="view view--developer">
        <div className="layer-badge layer-badge--developer">
          <span className="dot"></span>
          Developer Perspective
        </div>

        <h2 className="card-title">Simulation &amp; Testing</h2>
        <p className="card-description">
          Debug flows locally. Run in CI. Catch structural issues before production.
        </p>

        <div className="terminal-container">
          <div className="terminal-header">
            <div className="header-dots">
              <span></span><span></span><span></span>
            </div>
            <span>terminal</span>
          </div>
          <div className="terminal-body">
            <div className={`term-line${revealedLines.has(0) ? ' revealed' : ''}`}>
              <span className="term-prompt">$</span> <span className="term-cmd">flowprint run patient-intake.flowprint.yaml</span>
            </div>
            <div className={`term-line term-blank${revealedLines.has(1) ? ' revealed' : ''}`}>&nbsp;</div>
            <div className={`term-line${revealedLines.has(2) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">check_in</span> <span className="term-timing">0ms</span>
            </div>
            <div className={`term-line${revealedLines.has(3) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">verify_insurance</span> <span className="term-timing">12ms</span>
            </div>
            <div className={`term-line${revealedLines.has(4) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">initial_assessment</span> <span className="term-timing">8ms</span>
            </div>
            <div className={`term-line${revealedLines.has(5) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">priority_rating</span> <span className="term-timing">3ms</span> &nbsp;<span className="term-route">{'\u2192'} urgent</span>
            </div>
            <div className={`term-line${revealedLines.has(6) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">emergency_prep</span> <span className="term-timing">22ms</span>
            </div>
            <div className={`term-line${revealedLines.has(7) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">doctor_review</span> <span className="term-timing">15ms</span>
            </div>
            <div className={`term-line${revealedLines.has(8) ? ' revealed' : ''}`}>
              <span className="term-check">{'\u2714'}</span> <span className="term-node-name">end</span> <span className="term-timing">0ms</span>
            </div>
            <div className={`term-line term-blank${revealedLines.has(9) ? ' revealed' : ''}`}>&nbsp;</div>
            <div className={`term-line${revealedLines.has(10) ? ' revealed' : ''}`}>
              <span className="term-summary">7/7 nodes passed {'\u00B7'} 60ms total</span>
            </div>
            <div className={`term-line${revealedLines.has(11) ? ' revealed' : ''}`}>
              <span className="term-cursor"></span>
            </div>
          </div>
        </div>

        <button className="cta" onClick={handleShowBusiness}>
          <span>See the business view</span>
          <span className="cta-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
      </div>

    </div>
  )
}
