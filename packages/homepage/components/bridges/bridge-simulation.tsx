'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
import { useTimers } from '@/hooks/use-timers'
import { WalkthroughSvg } from './walkthrough-svg'
import { StepByStepSvg } from './step-by-step-svg'
import { WhatIfSvg } from './what-if-svg'
import {
  walkthroughPath,
  stepByStepPath,
  whatIfPathA,
  whatIfPathB,
  fileNames,
  nodeCenters,
  type BridgeSimulationProps,
  type RippleObj,
  type SimMode,
} from './simulation-data'
import './bridge-simulation.css'
import '../flow/flow.css'

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

  // Timer hooks
  const { addTimer, clearTimers, timersRef: animationTimers } = useTimers()
  const { addTimer: addDevTimer, clearTimers: clearDevTimers, timersRef: devAnimTimers } = useTimers()
  const rippleIdCounter = useRef(0)
  const currentViewRef = useRef<'business' | 'developer'>(perspective === 'developer' ? 'developer' : 'business')
  const currentModeRef = useRef<SimMode>('walkthrough')
  const stepIndexRef = useRef(-1)

  const { containerRef, bizRef: bizViewRef, devRef: devViewRef } = useDynamicHeight(showDev)

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
      addTimer(() => startDevAnimation(), 0)
    } else {
      stopDevAnimation()
      startSimulation(currentModeRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspective])

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
        addTimer(() => runWalkthrough(), 0)
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
    addTimer(() => stepForward(), 0)
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

    // Pulse the green glow with chained timers
    addTimer(() => {
      setFraudNodeRectStyle({
        stroke: '#3FDC77',
        filter: 'drop-shadow(0 0 16px rgba(63, 220, 119, 0.7))',
        transition: 'all 0.6s ease',
      })
    }, 0)
    addTimer(() => {
      setFraudNodeRectStyle({
        stroke: '#3FDC77',
        filter: 'drop-shadow(0 0 8px rgba(63, 220, 119, 0.3))',
        transition: 'all 0.6s ease',
      })
    }, 400)
    addTimer(() => {
      setFraudNodeRectStyle({
        stroke: '#3FDC77',
        filter: 'drop-shadow(0 0 16px rgba(63, 220, 119, 0.7))',
        transition: 'all 0.6s ease',
      })
    }, 800)
    addTimer(() => {
      setFraudNodeRectStyle({ stroke: 'rgba(255,146,67,0.3)' })
      if (callback) callback()
    }, 1200)
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
              addTimer(() => runWhatIf(), 0)
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
        addDevTimer(() => startDevAnimation(), 0)
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
    addTimer(() => {
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
    addTimer(() => startDevAnimation(), 0)
  }, [stopAllAnimations, startDevAnimation, addTimer])

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

            <WalkthroughSvg
              isActive={activeSvg === 'walkthrough'}
              getNodeClassName={getNodeClassName}
              getEdgeClassName={getEdgeClassName}
              wtRipples={wtRipples}
            />

            <StepByStepSvg
              isActive={activeSvg === 'stepbystep'}
              getNodeClassName={getNodeClassName}
              getEdgeClassName={getEdgeClassName}
              isTooltipVisible={isTooltipVisible}
              sbRipples={sbRipples}
            />

            <WhatIfSvg
              isActive={activeSvg === 'whatif'}
              getNodeClassName={getNodeClassName}
              getEdgeClassName={getEdgeClassName}
              wiRipples={wiRipples}
              fraudNodeStyle={fraudNodeStyle}
              fraudNodeRectStyle={fraudNodeRectStyle}
              investigateEdgesOpacity={investigateEdgesOpacity}
              investigateLabelOpacity={investigateLabelOpacity}
              errorTooltipVisible={errorTooltipVisible}
            />

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
