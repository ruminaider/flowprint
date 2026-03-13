'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { OverviewFlowSvg } from './overview-flow-svg'
import { Badge } from './shared/badge'
import { BridgeCTA } from './shared/bridge-cta'
import './bridge-shared.css'
import './overview-parallax.css'
import '../flow/flow.css'

type ViewState = 'business' | 'peeked' | 'developer'
type Direction = 'forward' | 'backward'

const TILT_MAX = 3
const PEEK_ANGLE = 30
const LERP_FACTOR = 0.08

interface OverviewParallaxProps {
  perspective?: 'business' | 'developer'
  onPerspectiveChange?: (p: 'business' | 'developer') => void
}

export function OverviewParallax({ perspective, onPerspectiveChange }: OverviewParallaxProps = {}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const rotateRef = useRef({ x: 0, y: 0 })
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [state, setState] = useState<ViewState>('business')
  const [direction, setDirection] = useState<Direction>('forward')

  // Store state/direction in refs so the rAF loop and setTimeout see latest values
  const stateRef = useRef(state)
  const directionRef = useRef(direction)
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { directionRef.current = direction }, [direction])

  /* ── Set state with auto-advance from peeked ── */
  const setViewState = useCallback((newState: ViewState) => {
    if (peekTimerRef.current) {
      clearTimeout(peekTimerRef.current)
      peekTimerRef.current = null
    }
    setState(newState)

    if (newState === 'peeked') {
      peekTimerRef.current = setTimeout(() => {
        if (directionRef.current === 'forward') {
          setState('developer')
        } else {
          setState('business')
        }
      }, 900)
    }
  }, [])

  /* ── Cycle through states ── */
  const cycleState = useCallback(() => {
    const current = stateRef.current
    if (current === 'business') {
      setDirection('forward')
      directionRef.current = 'forward'
      setViewState('peeked')
    } else if (current === 'peeked') {
      if (directionRef.current === 'forward') {
        setViewState('developer')
      } else {
        setViewState('business')
      }
    } else {
      // developer -> peeked (backward), then auto-advance to business
      setDirection('backward')
      directionRef.current = 'backward'
      setViewState('peeked')
    }
  }, [setViewState])

  /* ── Sync with external perspective prop ── */
  useEffect(() => {
    if (!perspective) return
    const current = stateRef.current
    if (perspective === 'developer' && current !== 'developer') {
      setDirection('forward')
      directionRef.current = 'forward'
      setViewState('peeked')
    } else if (perspective === 'business' && current !== 'business') {
      setDirection('backward')
      directionRef.current = 'backward'
      setViewState('peeked')
    }
  }, [perspective, setViewState])

  /* ── Animation loop: lerp-smoothed tilt + state-driven base rotation ── */
  const animate = useCallback(() => {
    const card = cardRef.current
    if (!card) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    const mouse = mouseRef.current
    const rotate = rotateRef.current

    const tiltX = -mouse.y * TILT_MAX
    const tiltY = mouse.x * TILT_MAX

    const baseY = stateRef.current === 'peeked' ? PEEK_ANGLE : 0

    const targetRotateX = tiltX
    const targetRotateY = baseY + tiltY

    rotate.x += (targetRotateX - rotate.x) * LERP_FACTOR
    rotate.y += (targetRotateY - rotate.y) * LERP_FACTOR

    card.style.transform =
      'rotateX(' + rotate.x.toFixed(3) + 'deg) ' +
      'rotateY(' + rotate.y.toFixed(3) + 'deg)'

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  /* ── Setup mousemove listener and animation loop ── */
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }

    const handleMouseLeave = () => {
      mouseRef.current.x = 0
      mouseRef.current.y = 0
    }

    scene.addEventListener('mousemove', handleMouseMove)
    scene.addEventListener('mouseleave', handleMouseLeave)

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      scene.removeEventListener('mousemove', handleMouseMove)
      scene.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(rafRef.current)
      if (peekTimerRef.current) {
        clearTimeout(peekTimerRef.current)
      }
    }
  }, [animate])

  /* ── Card class based on state ── */
  const cardClassName =
    'card' +
    (state === 'peeked' ? ' state-peeked' : '') +
    (state === 'developer' ? ' state-developer' : '')

  /* ── Click on card when peeked ── */
  const handleCardClick = useCallback(() => {
    if (stateRef.current === 'peeked') {
      cycleState()
    }
  }, [cycleState])

  const handleCtaClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onPerspectiveChange) {
        const current = stateRef.current
        onPerspectiveChange(current === 'developer' ? 'business' : 'developer')
      } else {
        cycleState()
      }
    },
    [cycleState, onPerspectiveChange],
  )

  return (
    <div className="overview-parallax">
      <div className="ambient ambient--1" />
      <div className="ambient ambient--2" />

      <div className="scene" ref={sceneRef}>
        <div className={cardClassName} ref={cardRef} onClick={handleCardClick}>
          {/* ===== FRONT FACE — Business Perspective ===== */}
          <div className="layer layer--front">
            <Badge variant="business" colorScheme="magenta-teal">
              Business Perspective
            </Badge>

            <h2 className="card-title">Service Blueprints</h2>
            <p className="card-description">
              Design configurable service flows visually &mdash; drag nodes, connect paths,
              define swimlanes, and embed decision tables at every routing point.
              Your entire business process in one executable specification.
            </p>

            {/* Flow diagram sub-container with editor header */}
            <div className="flow-container">
              <div className="flow-panel-header">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="#6b5a4d" />
                </svg>
                <span>order-fulfillment.flowprint</span>
                <div className="header-dot" />
              </div>
              <div className="flow-panel-body">
                <OverviewFlowSvg />
              </div>
            </div>

            <BridgeCTA onClick={handleCtaClick}>
              <span>See the developer toolchain</span>
              <span className="inline-flex transition-transform duration-[400ms] ease-out-expo">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </BridgeCTA>
          </div>

          {/* ===== SEPARATOR PLANE (Flowprint Engine) ===== */}
          <div className="layer layer--separator">
            <div className="separator-content">
              <span className="pulse-ring" />
              <span className="engine-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              Flowprint Engine
            </div>
          </div>

          {/* ===== BACK FACE — Developer Perspective ===== */}
          <div className="layer layer--back">
            <Badge variant="developer" colorScheme="magenta-teal">
              Developer Perspective
            </Badge>

            <h2 className="card-title">Service Blueprints</h2>
            <p className="card-description">
              Validated specifications feed your existing toolchain &mdash; CI catches structural
              errors, deterministic YAML diffs cleanly, and one command generates production
              Temporal TypeScript. No Flowprint runtime dependency.
            </p>

            {/* Toolchain grid (3x2) */}
            <div className="toolchain-grid">
              {/* 1. GitHub CI/CD */}
              <div className="tool-card tool-card--ci">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                  </div>
                  <div className="tool-card-title">GitHub CI/CD</div>
                </div>
                <div className="tool-card-body">
                  <div className="ci-badge ci-badge--pass">
                    <span>&#10003;</span> CI Passed
                  </div>
                  <div className="ci-line"><span className="ci-check">&#10003;</span><span className="ci-label">Schema valid</span></div>
                  <div className="ci-line"><span className="ci-check">&#10003;</span><span className="ci-label">Refs resolved</span></div>
                  <div className="ci-line"><span className="ci-check">&#10003;</span><span className="ci-label">Types matched</span></div>
                  <div className="ci-line"><span className="ci-check">&#10003;</span><span className="ci-label">No cycles</span></div>
                </div>
              </div>

              {/* 2. YAML Artifact */}
              <div className="tool-card tool-card--yaml">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z" /><path d="M4.5 5.5l2 2.5v3h1V8l2-2.5H8.3L7 7.2 5.7 5.5H4.5z" /></svg>
                  </div>
                  <div className="tool-card-title">.flowprint.yaml</div>
                </div>
                <div className="tool-card-body">
                  <div className="yaml-snippet">
                    <span className="yaml-key">schema:</span> <span className="yaml-val">flowprint/1.0</span><br />
                    <span className="yaml-key">name:</span> <span className="yaml-val">order-fulfillment</span><br />
                    <span className="yaml-key">nodes:</span><br />
                    <span style={{ opacity: 0.4 }}>&nbsp;&nbsp;</span><span className="yaml-key">route_order:</span><br />
                    <span style={{ opacity: 0.4 }}>&nbsp;&nbsp;&nbsp;&nbsp;</span><span className="yaml-key">type:</span> <span className="yaml-val">switch</span>
                  </div>
                </div>
              </div>

              {/* 3. npm */}
              <div className="tool-card tool-card--npm">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M0 0v16h16V0H0zm13 13H8V5h-2v8H3V3h10v10z" /></svg>
                  </div>
                  <div className="tool-card-title">npm</div>
                </div>
                <div className="tool-card-body">
                  <div className="npm-cmd">
                    <span className="npm-prompt">$</span> npm i <span className="npm-pkg">@ruminaider/<br />flowprint-editor</span>
                  </div>
                  <div className="npm-result">
                    added 1 package in 2.1s<br />
                    <span style={{ color: 'var(--true-green, #5ae07a)' }}>0</span> vulnerabilities
                  </div>
                </div>
              </div>

              {/* 4. Code Generation */}
              <div className="tool-card tool-card--codegen">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.854 4.854a.5.5 0 10-.708-.708l-3.5 3.5a.5.5 0 000 .708l3.5 3.5a.5.5 0 00.708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 01.708-.708l3.5 3.5a.5.5 0 010 .708l-3.5 3.5a.5.5 0 01-.708-.708L13.293 8l-3.147-3.146z" /></svg>
                  </div>
                  <div className="tool-card-title">Code Generation</div>
                </div>
                <div className="tool-card-body">
                  <div className="codegen-flow">
                    <span className="codegen-file codegen-from">.yaml</span>
                    <span className="codegen-arrow">&rarr;</span>
                    <span className="codegen-file codegen-to">.ts</span>
                  </div>
                  <div className="codegen-desc">
                    Temporal workflows<br />
                    + typed routing from<br />
                    hit-policy definitions
                  </div>
                </div>
              </div>

              {/* 5. Git Diff */}
              <div className="tool-card tool-card--git">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M15.698 7.287L8.712.302a1.03 1.03 0 00-1.457 0l-1.45 1.45 1.84 1.84a1.223 1.223 0 011.55 1.56l1.773 1.774a1.224 1.224 0 11-.733.693L8.535 5.918v4.27a1.223 1.223 0 11-1.008-.036V5.837a1.223 1.223 0 01-.664-1.605L5.093 2.463l-4.79 4.79a1.03 1.03 0 000 1.457l6.986 6.986a1.03 1.03 0 001.457 0l6.953-6.953a1.031 1.031 0 000-1.457z" /></svg>
                  </div>
                  <div className="tool-card-title">Git</div>
                </div>
                <div className="tool-card-body">
                  <div className="diff-header">order-fulfillment.flowprint.yaml</div>
                  <div className="diff-line diff-ctx">&nbsp; route_order:</div>
                  <div className="diff-line diff-del">-&nbsp;&nbsp; hit: collect</div>
                  <div className="diff-line diff-add">+&nbsp;&nbsp; hit: first</div>
                  <div className="diff-line diff-ctx">&nbsp; conditions:</div>
                  <div className="diff-line diff-add">+&nbsp;&nbsp; - membership</div>
                </div>
              </div>

              {/* 6. Schema Validation */}
              <div className="tool-card tool-card--schema">
                <div className="tool-card-header">
                  <div className="tool-card-icon">
                    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a2 2 0 012 2v1H6V3a2 2 0 012-2zm3 3V3a3 3 0 00-6 0v1H3.5A1.5 1.5 0 002 5.5v8A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5v-8A1.5 1.5 0 0012.5 4H11zM7.5 9a.5.5 0 01.5-.5h.01a.5.5 0 01.49.5v.01a.5.5 0 01-.5.49H8a.5.5 0 01-.5-.5V9z" /><path d="M10.854 6.146a.5.5 0 010 .708l-3 3a.5.5 0 01-.708 0l-1.5-1.5a.5.5 0 11.708-.708L7.5 8.793l2.646-2.647a.5.5 0 01.708 0z" /></svg>
                  </div>
                  <div className="tool-card-title">Schema Validation</div>
                </div>
                <div className="tool-card-body">
                  <div className="schema-line"><span className="schema-icon schema-ok">&#9679;</span><span className="schema-label">flowprint/1.0 conformant</span></div>
                  <div className="schema-line"><span className="schema-icon schema-ok">&#9679;</span><span className="schema-label">0 dangling refs</span></div>
                  <div className="schema-line"><span className="schema-icon schema-ok">&#9679;</span><span className="schema-label">Deterministic key order</span></div>
                  <div className="schema-line"><span className="schema-icon schema-ok">&#9679;</span><span className="schema-label">6 nodes validated</span></div>
                </div>
              </div>
            </div>

            <BridgeCTA onClick={handleCtaClick}>
              <span className="inline-flex transition-transform duration-[400ms] ease-out-expo" style={{ transform: 'rotate(180deg)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>See the business workflow</span>
            </BridgeCTA>
          </div>

          {/* ===== LIQUID COLOR BLEED OVERLAY ===== */}
          <div className="color-bleed" />
        </div>
      </div>
    </div>
  )
}
