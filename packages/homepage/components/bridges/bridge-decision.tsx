'use client'

import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
import './bridge-shared.css'
import './bridge-decision.css'

gsap.registerPlugin(useGSAP)

interface BridgeDecisionProps {
  perspective: 'business' | 'developer'
}

const DECISION_ROWS = [
  { tier: 'Enterprise', value: 'Any', valueClass: 'cell-value--any', route: 'express' },
  { tier: 'Business', value: '> $10k', valueClass: 'cell-value--input', route: 'review' },
  { tier: 'Business', value: '\u2264 $10k', valueClass: 'cell-value--input', route: 'standard' },
  { tier: 'Starter', value: 'Any', valueClass: 'cell-value--any', route: 'standard' },
]

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

  // Text content state (kept as React state for rendering)
  const [inputTier, setInputTier] = useState("'enterprise'")
  const [inputValue, setInputValue] = useState('50,000')
  const [outputRoute, setOutputRoute] = useState("'express'")

  const containerRef = useRef<HTMLDivElement>(null)
  const inputJsonRef = useRef<HTMLDivElement>(null)
  const outputJsonRef = useRef<HTMLDivElement>(null)
  const particleInRef = useRef<HTMLDivElement>(null)
  const particleOutRef = useRef<HTMLDivElement>(null)

  const { containerRef: viewsRef, bizRef: bizViewRef, devRef: devViewRef } = useDynamicHeight(isDev)

  const animateParticle = useCallback(
    (particle: HTMLDivElement | null, onComplete?: () => void) => {
      if (!particle) return
      const parent = particle.parentElement
      if (!parent) return
      const width = parent.offsetWidth

      gsap.fromTo(
        particle,
        { left: 0, opacity: 0 },
        {
          left: width - 6,
          duration: 0.4,
          ease: 'power3.out',
          keyframes: {
            opacity: [0, 1, 1, 0],
          },
          onComplete: () => {
            gsap.set(particle, { opacity: 0 })
            onComplete?.()
          },
        },
      )
    },
    [],
  )

  useGSAP(
    () => {
      if (!isDev) return

      const inputJson = inputJsonRef.current
      const outputJson = outputJsonRef.current
      const container = containerRef.current
      if (!inputJson || !outputJson || !container) return

      const rows = container.querySelectorAll('.flow-table tbody tr')
      if (!rows.length) return

      let caseIndex = 0

      const runCycle = () => {
        const tc = testCases[caseIndex % testCases.length]

        // Update text content via React state
        setInputTier(`'${tc.tier}'`)
        setInputValue(tc.value.toLocaleString())
        setOutputRoute(`'${tc.route}'`)

        const tl = gsap.timeline({
          onComplete: () => {
            caseIndex++
            gsap.delayedCall(0.4, runCycle)
          },
        })

        // Phase 1: Input slides in (0s)
        tl.fromTo(
          inputJson,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
          0,
        ).set(
          inputJson,
          {
            borderColor: 'rgba(228, 70, 255, 0.3)',
            boxShadow: '0 0 12px rgba(228, 70, 255, 0.15)',
          },
          0,
        )

        // Phase 2: Arrow in + particle (0.6s)
        tl.call(
          () => {
            container.querySelectorAll('.arrow-line').forEach((el, i) => {
              if (i === 0) el.classList.add('active')
            })
            container.querySelectorAll('.arrow-head').forEach((el, i) => {
              if (i === 0) el.classList.add('active')
            })
            animateParticle(particleInRef.current)
          },
          [],
          0.6,
        )

        // Phase 3: Table rows scan (1.2s, staggered 0.2s each)
        rows.forEach((_, i) => {
          tl.call(
            () => {
              rows.forEach((r, j) => {
                r.classList.remove('row-match', 'row-dim')
                if (j === i) r.classList.add('row-match')
              })
            },
            [],
            1.2 + i * 0.2,
          )
        })

        // Phase 4: Settle on matched row (2.2s)
        tl.call(
          () => {
            rows.forEach((r, i) => {
              r.classList.remove('row-match', 'row-dim')
              r.classList.add(i === tc.matchRow - 1 ? 'row-match' : 'row-dim')
            })
          },
          [],
          2.2,
        )

        // Phase 5: Arrow out + particle (2.8s)
        tl.call(
          () => {
            container.querySelectorAll('.arrow-line').forEach((el, i) => {
              if (i === 1) el.classList.add('active')
            })
            container.querySelectorAll('.arrow-head').forEach((el, i) => {
              if (i === 1) el.classList.add('active')
            })
            animateParticle(particleOutRef.current)
          },
          [],
          2.8,
        )

        // Phase 6: Output appears (3.2s)
        tl.fromTo(
          outputJson,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
          3.2,
        ).set(
          outputJson,
          {
            borderColor: 'rgba(228, 70, 255, 0.3)',
            boxShadow: '0 0 12px rgba(228, 70, 255, 0.15)',
          },
          3.2,
        )

        // Phase 7: Hold then reset (4.8s)
        tl.call(
          () => {
            gsap.set(inputJson, {
              opacity: 0,
              x: -20,
              clearProps: 'borderColor,boxShadow',
            })
            gsap.set(outputJson, {
              opacity: 0,
              x: 20,
              clearProps: 'borderColor,boxShadow',
            })
            container.querySelectorAll('.arrow-line').forEach((el) => {
              el.classList.remove('active')
            })
            container.querySelectorAll('.arrow-head').forEach((el) => {
              el.classList.remove('active')
            })
            rows.forEach((r) => r.classList.remove('row-match', 'row-dim'))
            gsap.set([particleInRef.current, particleOutRef.current], {
              opacity: 0,
            })
          },
          [],
          4.8,
        )
      }

      gsap.delayedCall(0.3, runCycle)
    },
    { scope: containerRef, dependencies: [isDev, animateParticle] },
  )

  const policyInfo = policyDescriptions[hitPolicy]

  return (
    <div className="bridge-decision" ref={containerRef}>
      <div className="bridge-card card">
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
                    <button
                      key={policy}
                      className={`hit-option${hitPolicy === policy ? ' active' : ''}`}
                      onClick={() => setHitPolicy(policy)}
                    >
                      {policy.charAt(0).toUpperCase() + policy.slice(1)}
                    </button>
                  ),
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
                {DECISION_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{i + 1}</td>
                    <td>
                      <span className="cell-value cell-value--input">
                        {row.tier}
                      </span>
                    </td>
                    <td>
                      <span className={`cell-value ${row.valueClass}`}>
                        {row.value}
                      </span>
                    </td>
                    <td>
                      <span className="cell-value cell-value--output">
                        {row.route}
                      </span>
                    </td>
                  </tr>
                ))}
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
              <div ref={inputJsonRef} className="flow-json flow-json--input">
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
              <div className="flow-arrow">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line
                    className="arrow-line"
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                  />
                  <polygon
                    className="arrow-head"
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
                    {DECISION_ROWS.map((row, i) => (
                      <tr key={i}>
                        <td>{row.tier}</td>
                        <td>{row.value}</td>
                        <td>{row.route}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Arrow out */}
              <div className="flow-arrow">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <line
                    className="arrow-line"
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                  />
                  <polygon
                    className="arrow-head"
                    points="28,5 38,10 28,15"
                  />
                </svg>
                <div
                  className="flow-particle"
                  ref={particleOutRef}
                ></div>
              </div>

              {/* Output JSON */}
              <div ref={outputJsonRef} className="flow-json flow-json--output">
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
