'use client'

import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
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
import './bridge-shared.css'
import './bridge-simulation.css'
import '../flow/flow.css'

gsap.registerPlugin(useGSAP)

// ══════════════════════════════════════════════════════
// DOM HELPERS — target SVG elements via data attributes
// ══════════════════════════════════════════════════════

const q = {
  node: (el: Element, id: string) => el.querySelector(`[data-node-id="${id}"]`),
  edge: (el: Element, id: string) => el.querySelector(`[data-edge-id="${id}"]`),
  tooltip: (el: Element, id: string) => el.querySelector(`[data-tooltip-id="${id}"]`),
  edgeLabel: (el: Element, id: string) => el.querySelector(`[data-edge-label="${id}"]`),
}

/** Get the mutable className string for an SVG or HTML element */
function getBaseClassName(el: Element): string {
  const cn = el.className
  if (typeof cn === 'string') return cn
  // SVGAnimatedString
  return (cn as SVGAnimatedString).baseVal
}

function setBaseClassName(el: Element, val: string) {
  const cn = el.className
  if (typeof cn === 'string') {
    // HTML element
    ;(el as HTMLElement).className = val
  } else {
    // SVG element
    ;(cn as SVGAnimatedString).baseVal = val
  }
}

function setNodeClass(el: Element, nodeId: string, cls: string) {
  const g = q.node(el, nodeId)
  if (!g) return
  const base = getBaseClassName(g).replace(/\s*(active|visited|debug-active|active-error)\b/g, '')
  setBaseClassName(g, cls ? `${base} ${cls}` : base)
}

function clearNodeClass(el: Element, nodeId: string) {
  setNodeClass(el, nodeId, '')
}

function setEdgeClass(el: Element, edgeId: string, cls: string) {
  const e = q.edge(el, edgeId)
  if (!e) return
  const base = getBaseClassName(e).replace(/\s*(active-edge|visited-edge|debug-edge|debug-visited-edge|error-edge|error-visited-edge)\b/g, '')
  setBaseClassName(e, cls ? `${base} ${cls}` : base)
}

function clearEdgeClass(el: Element, edgeId: string) {
  setEdgeClass(el, edgeId, '')
}

function setTooltipVisible(el: Element, tooltipId: string, visible: boolean) {
  const t = q.tooltip(el, tooltipId)
  if (!t) return
  if (visible) {
    t.classList.add('visible')
  } else {
    t.classList.remove('visible')
  }
}

/** Reset all node/edge/tooltip classes in a container to their base state */
function resetSvgClasses(el: Element) {
  el.querySelectorAll('[data-node-id]').forEach(g => {
    const base = getBaseClassName(g).replace(/\s*(active|visited|debug-active|active-error)\b/g, '')
    setBaseClassName(g, base)
  })
  el.querySelectorAll('[data-edge-id]').forEach(e => {
    const base = getBaseClassName(e).replace(/\s*(active-edge|visited-edge|debug-edge|debug-visited-edge|error-edge|error-visited-edge)\b/g, '')
    setBaseClassName(e, base)
  })
  el.querySelectorAll('[data-tooltip-id]').forEach(t => {
    t.classList.remove('visible')
  })
}

// ══════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════

export function BridgeSimulation({ perspective }: BridgeSimulationProps) {
  const [showDev, setShowDev] = useState(perspective === 'developer')
  const [currentMode, setCurrentMode] = useState<SimMode>('walkthrough')
  const [statusText, setStatusText] = useState('Simulating...')
  const [activeSvg, setActiveSvg] = useState<SimMode>('walkthrough')
  const [stepIndex, setStepIndex] = useState(-1)
  const [scenarioLabelText, setScenarioLabelText] = useState('')

  // Ripple state — kept as React state (CSS keyframe-animated)
  const [wtRipples, setWtRipples] = useState<RippleObj[]>([])
  const [sbRipples, setSbRipples] = useState<RippleObj[]>([])
  const [wiRipples, setWiRipples] = useState<RippleObj[]>([])

  // Developer terminal
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set())

  // Refs
  const rippleIdCounter = useRef(0)
  const simRef = useRef<HTMLDivElement>(null)
  const bizTlRef = useRef<gsap.core.Timeline | null>(null)
  const devTlRef = useRef<gsap.core.Timeline | null>(null)
  const stepIndexRef = useRef(-1)
  const currentModeRef = useRef<SimMode>('walkthrough')
  const showDevRef = useRef(perspective === 'developer')

  const { containerRef, bizRef: bizViewRef, devRef: devViewRef } = useDynamicHeight(showDev)

  // ══════════════════════════════════════════════════════
  // RIPPLE EFFECT (React state + CSS keyframes)
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

    // Auto-remove after animation
    setTimeout(() => {
      const ids = new Set(newRipples.map(r => r.id))
      setter(prev => prev.filter(p => !ids.has(p.id)))
    }, 1800)
  }, [])

  // ══════════════════════════════════════════════════════
  // RESET HELPERS
  // ══════════════════════════════════════════════════════
  const resetFraudNode = useCallback(() => {
    const el = simRef.current
    if (!el) return
    const fraud = q.node(el, 'wi-node-fraud') as SVGGElement | null
    if (fraud) {
      gsap.set(fraud, { opacity: 0, scale: 0, transformOrigin: '780px 325px' })
      const rect = fraud.querySelector('.node-rect')
      if (rect) gsap.set(rect, { attr: { style: 'stroke: rgba(255,146,67,0.3)' }, clearProps: 'filter' })
    }
    // Hide investigate edges and label
    const invH = q.edge(el, 'wi-edge-assess-investigate-h')
    const invV = q.edge(el, 'wi-edge-assess-investigate-v')
    const invLabel = q.edgeLabel(el, 'investigate')
    if (invH) gsap.set(invH, { opacity: 0 })
    if (invV) gsap.set(invV, { opacity: 0 })
    if (invLabel) gsap.set(invLabel, { opacity: 0 })
  }, [])

  const resetAllVisuals = useCallback(() => {
    const el = simRef.current
    if (!el) return
    resetSvgClasses(el)
    setWtRipples([])
    setSbRipples([])
    setWiRipples([])
    resetFraudNode()
  }, [resetFraudNode])

  const killBizTimeline = useCallback(() => {
    if (bizTlRef.current) {
      bizTlRef.current.kill()
      bizTlRef.current = null
    }
  }, [])

  const killDevTimeline = useCallback(() => {
    if (devTlRef.current) {
      devTlRef.current.kill()
      devTlRef.current = null
    }
  }, [])

  // ══════════════════════════════════════════════════════
  // MODE 1: WALK-THROUGH (GSAP timeline)
  // ══════════════════════════════════════════════════════
  const runWalkthrough = useCallback(() => {
    const el = simRef.current
    if (!el) return

    const path = walkthroughPath
    const delay = 0.5

    const tl = gsap.timeline({
      onComplete: () => {
        if (showDevRef.current || currentModeRef.current !== 'walkthrough') return
        resetAllVisuals()
        setActiveSvg('walkthrough')
        // Small gap before looping
        gsap.delayedCall(0.1, () => {
          if (!showDevRef.current && currentModeRef.current === 'walkthrough') {
            runWalkthrough()
          }
        })
      },
    })
    bizTlRef.current = tl

    // Animate through each node
    path.nodes.forEach((nodeId, i) => {
      tl.call(() => {
        // Mark previous as visited
        if (i > 0) {
          setNodeClass(el, path.nodes[i - 1], 'visited')
          if (path.edges[i - 1]) setEdgeClass(el, path.edges[i - 1], 'visited-edge')
        }
        // Activate current
        setNodeClass(el, nodeId, 'active')
        if (path.edges[i]) setEdgeClass(el, path.edges[i], 'active-edge')

        const center = nodeCenters[nodeId]
        if (center) spawnRipple(center.x, center.y, '#3FDC77', 'walkthrough')

        setStatusText(`Walking: ${path.labels[i]} \u2022 ${i + 1}/${path.nodes.length} nodes`)
      }, undefined, i === 0 ? 0 : `>+=${delay}`)
    })

    // Mark last as visited
    tl.call(() => {
      const lastNode = path.nodes[path.nodes.length - 1]
      setNodeClass(el, lastNode, 'visited')
      const lastEdge = path.edges[path.edges.length - 1]
      if (lastEdge) setEdgeClass(el, lastEdge, 'visited-edge')
      setStatusText(`Walking: complete \u2022 ${path.nodes.length}/${path.nodes.length} nodes`)
    }, undefined, `>+=${delay}`)

    // Hold before loop
    tl.call(() => {}, undefined, '+=1.5')
  }, [spawnRipple, resetAllVisuals])

  // ══════════════════════════════════════════════════════
  // MODE 2: STEP-BY-STEP (user-driven)
  // ══════════════════════════════════════════════════════
  const stepForward = useCallback(() => {
    const el = simRef.current
    if (!el) return

    const path = stepByStepPath
    const idx = stepIndexRef.current
    if (idx >= path.nodes.length - 1) return

    // Transition current node from debug-active to visited
    if (idx >= 0) {
      setNodeClass(el, path.nodes[idx], 'visited')
      if (path.tooltips[idx]) setTooltipVisible(el, path.tooltips[idx]!, false)
      if (path.edges[idx]) setEdgeClass(el, path.edges[idx], 'debug-visited-edge')
    }

    const newIdx = idx + 1
    stepIndexRef.current = newIdx
    setStepIndex(newIdx)

    // Activate new node
    setNodeClass(el, path.nodes[newIdx], 'debug-active')

    // Spawn ripple
    const center = nodeCenters[path.nodes[newIdx]]
    if (center) spawnRipple(center.x, center.y, '#3FDC77', 'stepbystep')

    // Show tooltip
    if (path.tooltips[newIdx]) setTooltipVisible(el, path.tooltips[newIdx]!, true)

    // Activate leading edge
    if (path.edges[newIdx]) setEdgeClass(el, path.edges[newIdx], 'debug-edge')

    const nodeName = path.labels[newIdx]
    setStatusText(`Step ${newIdx + 1} of ${path.nodes.length} \u2022 ${nodeName}`)
  }, [spawnRipple])

  const stepBackward = useCallback(() => {
    const el = simRef.current
    if (!el) return

    const path = stepByStepPath
    const idx = stepIndexRef.current
    if (idx <= 0) return

    // Remove current node activation
    clearNodeClass(el, path.nodes[idx])
    if (path.tooltips[idx]) setTooltipVisible(el, path.tooltips[idx]!, false)
    if (path.edges[idx]) clearEdgeClass(el, path.edges[idx])

    const newIdx = idx - 1
    stepIndexRef.current = newIdx
    setStepIndex(newIdx)

    // Re-activate previous node
    setNodeClass(el, path.nodes[newIdx], 'debug-active')
    if (path.tooltips[newIdx]) setTooltipVisible(el, path.tooltips[newIdx]!, true)
    if (path.edges[newIdx]) setEdgeClass(el, path.edges[newIdx], 'debug-edge')

    const nodeName = path.labels[newIdx]
    setStatusText(`Step ${newIdx + 1} of ${path.nodes.length} \u2022 ${nodeName}`)
  }, [])

  const initStepByStep = useCallback(() => {
    stepIndexRef.current = -1
    setStepIndex(-1)
    setStatusText('Step-by-step \u2022 click Next to begin')
    // Auto-advance to first step after a tick
    gsap.delayedCall(0, () => stepForward())
  }, [stepForward])

  // ══════════════════════════════════════════════════════
  // MODE 3: WHAT-IF (GSAP timeline)
  // ══════════════════════════════════════════════════════
  const runWhatIf = useCallback(() => {
    const el = simRef.current
    if (!el) return

    const pathA = whatIfPathA
    const pathB = whatIfPathB
    const delayA = 0.45
    const delayB = 0.5

    const tl = gsap.timeline({
      onComplete: () => {
        if (showDevRef.current || currentModeRef.current !== 'whatif') return
        gsap.delayedCall(0.5, () => {
          if (!showDevRef.current && currentModeRef.current === 'whatif') {
            resetAllVisuals()
            setActiveSvg('whatif')
            gsap.delayedCall(0.1, () => runWhatIf())
          }
        })
      },
    })
    bizTlRef.current = tl

    // ── SCENARIO A ──
    tl.call(() => {
      setScenarioLabelText('Scenario A: Normal Claim')
    })

    pathA.nodes.forEach((nodeId, i) => {
      tl.call(() => {
        if (i > 0) {
          setNodeClass(el, pathA.nodes[i - 1], 'visited')
          if (pathA.edges[i - 1]) setEdgeClass(el, pathA.edges[i - 1], 'visited-edge')
        }
        setNodeClass(el, nodeId, 'active')
        if (pathA.edges[i]) setEdgeClass(el, pathA.edges[i], 'active-edge')
        const center = nodeCenters[nodeId]
        if (center) spawnRipple(center.x, center.y, '#3FDC77', 'whatif')
        setStatusText(`Scenario A \u2022 ${pathA.labels[i]} \u2022 ${i + 1}/${pathA.nodes.length}`)
      }, undefined, i === 0 ? 0 : `>+=${delayA}`)
    })

    // Mark last node visited
    tl.call(() => {
      const lastNode = pathA.nodes[pathA.nodes.length - 1]
      setNodeClass(el, lastNode, 'visited')
      const lastEdge = pathA.edges[pathA.edges.length - 1]
      if (lastEdge) setEdgeClass(el, lastEdge, 'visited-edge')
      setStatusText('Scenario A \u2022 All nodes passed')
    }, undefined, `>+=${delayA}`)

    // Pause, then transition to Scenario B
    tl.call(() => {
      if (showDevRef.current || currentModeRef.current !== 'whatif') { tl.kill(); return }
      // Reset for scenario B
      resetSvgClasses(el)
      resetFraudNode()
      setWiRipples([])
      setActiveSvg('whatif')
      setScenarioLabelText('Scenario B: + Fraud Detection')
      setStatusText('Adding Fraud Check node...')
    }, undefined, '+=1.5')

    // ── SCENARIO B: Show fraud node ──
    tl.call(() => {
      const fraud = q.node(el, 'wi-node-fraud') as SVGGElement | null
      if (!fraud) return
      gsap.to(fraud, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.7)',
        transformOrigin: '780px 325px',
      })
      const rect = fraud.querySelector('.node-rect')
      if (rect) {
        gsap.to(rect, {
          attr: { style: 'stroke: #3FDC77; filter: drop-shadow(0 0 16px rgba(63, 220, 119, 0.7))' },
          duration: 0.3,
        })
        gsap.to(rect, {
          attr: { style: 'stroke: #3FDC77; filter: drop-shadow(0 0 8px rgba(63, 220, 119, 0.3))' },
          duration: 0.3,
          delay: 0.4,
        })
        gsap.to(rect, {
          attr: { style: 'stroke: #3FDC77; filter: drop-shadow(0 0 16px rgba(63, 220, 119, 0.7))' },
          duration: 0.3,
          delay: 0.8,
        })
        gsap.to(rect, {
          attr: { style: 'stroke: rgba(255,146,67,0.3)' },
          duration: 0.3,
          delay: 1.2,
          clearProps: 'filter',
        })
      }
    }, undefined, '+=0.4')

    // Show investigate edges + label
    tl.call(() => {
      const invH = q.edge(el, 'wi-edge-assess-investigate-h')
      const invV = q.edge(el, 'wi-edge-assess-investigate-v')
      const invLabel = q.edgeLabel(el, 'investigate')
      if (invH) gsap.to(invH, { opacity: 1, duration: 0.4 })
      if (invV) gsap.to(invV, { opacity: 1, duration: 0.4 })
      if (invLabel) gsap.to(invLabel, { opacity: 1, duration: 0.4 })
    }, undefined, '+=0.3')

    // Wait for fraud node animation to settle
    tl.call(() => {}, undefined, '+=1.0')

    // ── SCENARIO B: Run path through to error ──
    const bStartLabel = 'scenarioB'
    pathB.nodes.forEach((nodeId, i) => {
      const isLast = i === pathB.nodes.length - 1

      tl.call(() => {
        if (i > 0) {
          setNodeClass(el, pathB.nodes[i - 1], 'visited')
          if (pathB.edges[i - 1]) setEdgeClass(el, pathB.edges[i - 1], 'visited-edge')
        }

        if (isLast) {
          // ERROR STATE
          setNodeClass(el, nodeId, 'active-error')
          const center = nodeCenters[nodeId]
          if (center) {
            spawnRipple(center.x, center.y, '#FF362B', 'whatif')
            setTimeout(() => spawnRipple(center.x, center.y, '#FF362B', 'whatif'), 300)
            setTimeout(() => spawnRipple(center.x, center.y, '#FF362B', 'whatif'), 600)
          }
          // Show error tooltip
          setTimeout(() => {
            const errTip = q.tooltip(el, 'wi-error-tooltip')
            if (errTip) errTip.classList.add('visible')
          }, 200)
          setStatusText('Scenario B \u2022 ERROR at Fraud Check')
          setScenarioLabelText('Scenario B: + Fraud Detection \u2192 Alert detected')
        } else {
          setNodeClass(el, nodeId, 'active')
          const center = nodeCenters[nodeId]
          if (center) spawnRipple(center.x, center.y, '#3FDC77', 'whatif')
          if (pathB.edges[i]) setEdgeClass(el, pathB.edges[i], 'active-edge')
          setStatusText(`Scenario B \u2022 ${pathB.labels[i]} \u2022 ${i + 1}/${pathB.nodes.length}`)
        }
      }, undefined, i === 0 ? `${bStartLabel}` : `>+=${delayB}`)
    })

    // Hold on error for 3 seconds before looping
    tl.call(() => {}, undefined, '+=3.0')
  }, [spawnRipple, resetAllVisuals, resetFraudNode])

  // ══════════════════════════════════════════════════════
  // DEVELOPER VIEW (GSAP timeline)
  // ══════════════════════════════════════════════════════
  const startDevAnimation = useCallback(() => {
    killDevTimeline()
    setRevealedLines(new Set())

    const delays = [0, 0.2, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.3]

    const tl = gsap.timeline({
      onComplete: () => {
        if (showDevRef.current) {
          gsap.delayedCall(2.2, () => {
            if (showDevRef.current) startDevAnimation()
          })
        }
      },
    })
    devTlRef.current = tl

    delays.forEach((d, i) => {
      tl.call(() => {
        setRevealedLines(prev => new Set([...prev, i]))
      }, undefined, d)
    })
  }, [killDevTimeline])

  // ══════════════════════════════════════════════════════
  // SIMULATION CONTROLLER
  // ══════════════════════════════════════════════════════
  const startSimulation = useCallback((mode: SimMode) => {
    killBizTimeline()
    resetAllVisuals()
    setActiveSvg(mode)

    // Defer start to let React flush the SVG swap
    gsap.delayedCall(0, () => {
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
    })
  }, [killBizTimeline, resetAllVisuals, runWalkthrough, initStepByStep, runWhatIf])

  // ══════════════════════════════════════════════════════
  // VIEW TOGGLE HANDLERS
  // ══════════════════════════════════════════════════════
  const handleShowDev = useCallback(() => {
    setShowDev(true)
    showDevRef.current = true
    killBizTimeline()
    resetAllVisuals()
    startDevAnimation()
  }, [killBizTimeline, resetAllVisuals, startDevAnimation])

  const handleShowBusiness = useCallback(() => {
    setShowDev(false)
    showDevRef.current = false
    killDevTimeline()
    setRevealedLines(new Set())
    startSimulation(currentModeRef.current)
  }, [killDevTimeline, startSimulation])

  // ══════════════════════════════════════════════════════
  // PILL TAB HANDLER
  // ══════════════════════════════════════════════════════
  const handleTabClick = useCallback((mode: SimMode) => {
    setCurrentMode(mode)
    currentModeRef.current = mode
    killBizTimeline()
    resetAllVisuals()
    startSimulation(mode)
  }, [killBizTimeline, resetAllVisuals, startSimulation])

  // ══════════════════════════════════════════════════════
  // INIT + CLEANUP via useGSAP
  // ══════════════════════════════════════════════════════
  useGSAP(() => {
    if (perspective === 'developer') {
      startDevAnimation()
    } else {
      startSimulation('walkthrough')
    }

    return () => {
      killBizTimeline()
      killDevTimeline()
      gsap.killTweensOf('*')
    }
  }, { scope: simRef, dependencies: [] })

  // Sync showDev with parent perspective prop
  const prevPerspective = useRef(perspective)
  useGSAP(() => {
    if (prevPerspective.current === perspective) return
    prevPerspective.current = perspective

    const isDev = perspective === 'developer'
    setShowDev(isDev)
    showDevRef.current = isDev

    if (isDev) {
      killBizTimeline()
      resetAllVisuals()
      startDevAnimation()
    } else {
      killDevTimeline()
      setRevealedLines(new Set())
      startSimulation(currentModeRef.current)
    }
  }, { dependencies: [perspective] })

  // ══════════════════════════════════════════════════════
  // KEYBOARD SUPPORT (scoped to container)
  // ══════════════════════════════════════════════════════
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (currentModeRef.current !== 'stepbystep' || showDevRef.current) return
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      stepForward()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      stepBackward()
    }
  }, [stepForward, stepBackward])

  // ══════════════════════════════════════════════════════
  // DERIVED STATE
  // ══════════════════════════════════════════════════════
  const statusDotClass =
    currentMode === 'stepbystep' && !showDev ? 'paused' :
    scenarioLabelText.includes('ERROR') || scenarioLabelText.includes('Alert') ? 'error' : ''
  const scenarioLabelClass = scenarioLabelText.includes('Scenario B') ? 'scenario-b' : scenarioLabelText.includes('Scenario A') ? 'scenario-a' : ''
  const scenarioLabelVisible = scenarioLabelText.length > 0 && currentMode === 'whatif' && !showDev
  const stepControlsVisible = currentMode === 'stepbystep' && !showDev

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div
      ref={(node: HTMLDivElement | null) => {
        // Share the ref between simRef and containerRef (from useDynamicHeight)
        simRef.current = node
        // containerRef from useDynamicHeight is a MutableRefObject
        ;(containerRef as { current: HTMLDivElement | null }).current = node
      }}
      className={`bridge-simulation${showDev ? ' show-dev' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ position: 'relative', width: 780, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5), 0 0 80px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.04)', overflow: 'hidden', transition: 'height 0.5s cubic-bezier(0.23, 1, 0.32, 1)', outline: 'none' }}
    >

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
              wtRipples={wtRipples}
            />

            <StepByStepSvg
              isActive={activeSvg === 'stepbystep'}
              sbRipples={sbRipples}
            />

            <WhatIfSvg
              isActive={activeSvg === 'whatif'}
              wiRipples={wiRipples}
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
