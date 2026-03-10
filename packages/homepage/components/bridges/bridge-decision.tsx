'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import './bridge-decision.css'

interface BridgeDecisionProps {
  perspective: 'business' | 'developer'
}

const testCases = [
  { tier: 'enterprise', value: 50000, matchRow: 1, route: 'express' },
  { tier: 'business', value: 25000, matchRow: 2, route: 'review' },
  { tier: 'business', value: 5000, matchRow: 3, route: 'standard' },
  { tier: 'starter', value: 800, matchRow: 4, route: 'standard' },
]

const policyDescriptions: Record<string, { icon: string; text: string }> = {
  first: {
    icon: 'F',
    text: 'First-hit policy \u2014 returns the first matching row. No ambiguity.',
  },
  collect: {
    icon: 'C',
    text: 'Collect policy \u2014 gathers all matching rows into a list.',
  },
  all: {
    icon: 'A',
    text: 'All policy \u2014 all rows must match; returns a single combined result.',
  },
  priority: {
    icon: 'P',
    text: 'Priority policy \u2014 returns the highest-priority matching row.',
  },
}

export function BridgeDecision({ perspective }: BridgeDecisionProps) {
  const isDev = perspective === 'developer'
  const [hitPolicy, setHitPolicy] = useState('first')

  // Animation state
  const [inputTier, setInputTier] = useState("'enterprise'")
  const [inputValue, setInputValue] = useState('50,000')
  const [outputRoute, setOutputRoute] = useState("'express'")
  const [inputAnimateIn, setInputAnimateIn] = useState(false)
  const [inputActive, setInputActive] = useState(false)
  const [outputAnimateIn, setOutputAnimateIn] = useState(false)
  const [outputActive, setOutputActive] = useState(false)
  const [arrowInActive, setArrowInActive] = useState(false)
  const [arrowOutActive, setArrowOutActive] = useState(false)
  const [rowStates, setRowStates] = useState<
    Array<'normal' | 'match' | 'dim'>
  >(['normal', 'normal', 'normal', 'normal'])

  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentCaseRef = useRef(0)
  const particleInRef = useRef<HTMLDivElement>(null)
  const particleOutRef = useRef<HTMLDivElement>(null)
  const arrowInRef = useRef<HTMLDivElement>(null)
  const arrowOutRef = useRef<HTMLDivElement>(null)
  const animationActiveRef = useRef(false)

  // Dynamic height refs
  const viewsRef = useRef<HTMLDivElement>(null)
  const bizViewRef = useRef<HTMLDivElement>(null)
  const devViewRef = useRef<HTMLDivElement>(null)
  const initialRenderRef = useRef(true)

  // Dynamic height: measure active view and set container height
  useEffect(() => {
    const activeView = isDev ? devViewRef.current : bizViewRef.current
    if (!activeView || !viewsRef.current) return
    const h = activeView.scrollHeight
    if (initialRenderRef.current) {
      viewsRef.current.style.transition = 'none'
      viewsRef.current.style.height = `${h}px`
      requestAnimationFrame(() => {
        if (viewsRef.current) viewsRef.current.style.transition = ''
      })
      initialRenderRef.current = false
    } else {
      viewsRef.current.style.height = `${h}px`
    }
  }, [isDev])

  const resetFlowState = useCallback(() => {
    setInputAnimateIn(false)
    setInputActive(false)
    setOutputAnimateIn(false)
    setOutputActive(false)
    setArrowInActive(false)
    setArrowOutActive(false)
    setRowStates(['normal', 'normal', 'normal', 'normal'])
    if (particleInRef.current) particleInRef.current.style.opacity = '0'
    if (particleOutRef.current) particleOutRef.current.style.opacity = '0'
  }, [])

  const animateParticle = useCallback((particle: HTMLDivElement | null) => {
    if (!particle) return
    const parent = particle.parentElement
    if (!parent) return
    const width = parent.offsetWidth

    particle.style.opacity = '0'
    particle.style.left = '0px'
    particle.style.top = '50%'
    particle.style.transform = 'translateY(-50%)'

    let start: number | null = null
    const duration = 400

    function step(ts: number) {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      particle!.style.left = eased * (width - 6) + 'px'
      particle!.style.opacity =
        progress < 0.1
          ? String(progress / 0.1)
          : progress > 0.9
            ? String((1 - progress) / 0.1)
            : '1'

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        particle!.style.opacity = '0'
      }
    }

    requestAnimationFrame(step)
  }, [])

  const runFlowAnimation = useCallback(() => {
    if (!animationActiveRef.current) return

    const tc = testCases[currentCaseRef.current]
    currentCaseRef.current =
      (currentCaseRef.current + 1) % testCases.length

    // Set input values
    setInputTier(`'${tc.tier}'`)
    setInputValue(tc.value.toLocaleString())
    setOutputRoute(`'${tc.route}'`)

    // Reset
    setInputAnimateIn(false)
    setInputActive(false)
    setOutputAnimateIn(false)
    setOutputActive(false)
    setArrowInActive(false)
    setArrowOutActive(false)
    setRowStates(['normal', 'normal', 'normal', 'normal'])
    if (particleInRef.current) particleInRef.current.style.opacity = '0'
    if (particleOutRef.current) particleOutRef.current.style.opacity = '0'

    // Phase 1: Input slides in (0ms)
    requestAnimationFrame(() => {
      if (!animationActiveRef.current) return
      setInputAnimateIn(true)
      setInputActive(true)
    })

    // Phase 2: Arrow in activates + particle (600ms)
    setTimeout(() => {
      if (!animationActiveRef.current) return
      setArrowInActive(true)
      animateParticle(particleInRef.current)
    }, 600)

    // Phase 3: Table rows scan (1200ms)
    const scanDelay = 200
    const scanStart = 1200
    ;[0, 1, 2, 3].forEach((i) => {
      setTimeout(() => {
        if (!animationActiveRef.current) return
        setRowStates((prev) =>
          prev.map((_, j) => (j === i ? 'match' : 'normal'))
        )
      }, scanStart + i * scanDelay)
    })

    // Phase 4: Settle on the matched row (2200ms)
    setTimeout(() => {
      if (!animationActiveRef.current) return
      setRowStates(
        [0, 1, 2, 3].map((i) =>
          i === tc.matchRow - 1 ? 'match' : 'dim'
        )
      )
    }, scanStart + 4 * scanDelay + 200)

    // Phase 5: Arrow out + particle (2800ms)
    setTimeout(() => {
      if (!animationActiveRef.current) return
      setArrowOutActive(true)
      animateParticle(particleOutRef.current)
    }, 2800)

    // Phase 6: Output appears (3200ms)
    setTimeout(() => {
      if (!animationActiveRef.current) return
      setOutputAnimateIn(true)
      setOutputActive(true)
    }, 3200)

    // Phase 7: Hold and reset (4800ms)
    animationTimerRef.current = setTimeout(() => {
      if (!animationActiveRef.current) return
      resetFlowState()
      // Brief pause, then next case
      animationTimerRef.current = setTimeout(() => {
        if (!animationActiveRef.current) return
        runFlowAnimation()
      }, 400)
    }, 4800)
  }, [animateParticle, resetFlowState])

  const stopAnimation = useCallback(() => {
    animationActiveRef.current = false
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current)
      animationTimerRef.current = null
    }
    resetFlowState()
  }, [resetFlowState])

  const startAnimation = useCallback(() => {
    stopAnimation()
    currentCaseRef.current = 0
    animationActiveRef.current = true
    setTimeout(() => {
      if (animationActiveRef.current) {
        runFlowAnimation()
      }
    }, 300)
  }, [stopAnimation, runFlowAnimation])

  // Start/stop animation based on perspective
  useEffect(() => {
    if (isDev) {
      startAnimation()
    } else {
      stopAnimation()
    }
    return () => {
      stopAnimation()
    }
  }, [isDev, startAnimation, stopAnimation])

  const policyInfo = policyDescriptions[hitPolicy]

  return (
    <div className="bridge-decision">
      <div className="card">
        {/* Header */}
        <div className="header">
          <div
            className={`badge ${isDev ? 'badge--developer' : 'badge--business'}`}
          >
            <span className="badge-dot"></span>
            <span>
              {isDev ? 'Developer Perspective' : 'Business Perspective'}
            </span>
          </div>
          <h1 className="title">Decision Tables</h1>
          <p className="description">
            {isDev
              ? 'Zero developer code for decision logic. GoRules ZEN evaluates tables natively at runtime.'
              : 'Define routing rules in a spreadsheet. No code, no developer needed.'}
          </p>
        </div>

        {/* Views */}
        <div ref={viewsRef} className="views">
          {/* BUSINESS VIEW */}
          <div
            ref={bizViewRef}
            className={`view view--business${isDev ? ' hidden' : ''}`}
          >
            <div className="table-toolbar">
              <div className="hit-policy">
                <span className="hit-policy-label">Hit Policy</span>
              </div>
              <div className="hit-policy-options">
                {['first', 'collect', 'all', 'priority'].map(
                  (policy) => (
                    <span
                      key={policy}
                      className={`hit-option${hitPolicy === policy ? ' active' : ''}`}
                      onClick={() => setHitPolicy(policy)}
                    >
                      {policy.charAt(0).toUpperCase() + policy.slice(1)}
                    </span>
                  )
                )}
              </div>
            </div>

            <table className="table-editor">
              <thead>
                <tr>
                  <th className="row-num">#</th>
                  <th className="col-input">
                    Tier<span className="col-type">input</span>
                  </th>
                  <th className="col-input">
                    Value<span className="col-type">input</span>
                  </th>
                  <th className="col-output">
                    Route<span className="col-type">output</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-num">1</td>
                  <td>
                    <span className="cell-value cell-value--input">
                      Enterprise
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--any">
                      Any
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--output">
                      express
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="row-num">2</td>
                  <td>
                    <span className="cell-value cell-value--input">
                      Business
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--input">
                      &gt; $10k
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--output">
                      review
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="row-num">3</td>
                  <td>
                    <span className="cell-value cell-value--input">
                      Business
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--input">
                      &le; $10k
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--output">
                      standard
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="row-num">4</td>
                  <td>
                    <span className="cell-value cell-value--input">
                      Starter
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--any">
                      Any
                    </span>
                  </td>
                  <td>
                    <span className="cell-value cell-value--output">
                      standard
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="table-note">
              <span className="table-note-icon">{policyInfo.icon}</span>
              <span>{policyInfo.text}</span>
            </div>
          </div>

          {/* DEVELOPER VIEW */}
          <div
            ref={devViewRef}
            className={`view view--developer${isDev ? ' visible' : ''}`}
          >
            <div className="flow-container">
              {/* Input JSON */}
              <div
                className={`flow-json flow-json--input${inputAnimateIn ? ' animate-in' : ''}${inputActive ? ' flow-json--active' : ''}`}
              >
                <span className="json-brace">{'{'}</span>
                <br />
                &nbsp;&nbsp;
                <span className="json-key">tier</span>
                <span className="json-brace">:</span>{' '}
                <span className="json-string">{inputTier}</span>
                <span className="json-brace">,</span>
                <br />
                &nbsp;&nbsp;
                <span className="json-key">value</span>
                <span className="json-brace">:</span>{' '}
                <span className="json-number">{inputValue}</span>
                <br />
                <span className="json-brace">{'}'}</span>
              </div>

              {/* Arrow in */}
              <div className="flow-arrow" ref={arrowInRef}>
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line
                    className={`arrow-line${arrowInActive ? ' active' : ''}`}
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                  />
                  <polygon
                    className={`arrow-head${arrowInActive ? ' active' : ''}`}
                    points="28,5 38,10 28,15"
                  />
                </svg>
                <div className="flow-particle" ref={particleInRef}></div>
              </div>

              {/* Decision Table */}
              <div className="flow-table-wrap">
                <table className="flow-table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Value</th>
                      <th>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        tier: 'Enterprise',
                        value: 'Any',
                        route: 'express',
                      },
                      {
                        tier: 'Business',
                        value: '> $10k',
                        route: 'review',
                      },
                      {
                        tier: 'Business',
                        value: '\u2264 $10k',
                        route: 'standard',
                      },
                      {
                        tier: 'Starter',
                        value: 'Any',
                        route: 'standard',
                      },
                    ].map((row, i) => (
                      <tr
                        key={i}
                        className={
                          rowStates[i] === 'match'
                            ? 'row-match'
                            : rowStates[i] === 'dim'
                              ? 'row-dim'
                              : ''
                        }
                      >
                        <td>{row.tier}</td>
                        <td>{row.value}</td>
                        <td>{row.route}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Arrow out */}
              <div className="flow-arrow" ref={arrowOutRef}>
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line
                    className={`arrow-line${arrowOutActive ? ' active' : ''}`}
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                  />
                  <polygon
                    className={`arrow-head${arrowOutActive ? ' active' : ''}`}
                    points="28,5 38,10 28,15"
                  />
                </svg>
                <div
                  className="flow-particle"
                  ref={particleOutRef}
                ></div>
              </div>

              {/* Output JSON */}
              <div
                className={`flow-json flow-json--output${outputAnimateIn ? ' animate-in' : ''}${outputActive ? ' flow-json--active' : ''}`}
              >
                <span className="json-brace">{'{'}</span>
                <br />
                &nbsp;&nbsp;
                <span className="json-key">route</span>
                <span className="json-brace">:</span>{' '}
                <span className="json-string">{outputRoute}</span>
                <br />
                <span className="json-brace">{'}'}</span>
              </div>
            </div>

            <div className="gorules-badge">
              Powered by <span>GoRules ZEN</span> — native decision table
              evaluation at runtime
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
