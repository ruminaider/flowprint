'use client'

import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { cn } from '@/lib/utils'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
import '../flow/flow.css'
import './bridge-decision-svg.css'

gsap.registerPlugin(useGSAP)

interface BridgeDecisionProps {
  perspective: 'business' | 'developer'
}

const DECISION_ROWS = [
  { tier: 'Enterprise', value: 'Any', valueClass: 'any' as const, route: 'express' },
  { tier: 'Business', value: '> $10k', valueClass: 'input' as const, route: 'review' },
  { tier: 'Business', value: '\u2264 $10k', valueClass: 'input' as const, route: 'standard' },
  { tier: 'Starter', value: 'Any', valueClass: 'any' as const, route: 'standard' },
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

const VALUE_CLASSES = {
  input: 'text-node-action',
  any: 'text-fg-muted italic',
} as const

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
      <div className="relative w-[min(780px,calc(100vw-48px))] max-w-full rounded-[20px] bg-surface border border-surface-border shadow-bridge-card overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 sm:px-8 sm:pt-7">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] mb-3 transition-all duration-[400ms]',
              isDev
                ? 'border border-accent/20 text-accent bg-accent/[0.12]'
                : 'border border-node-switch/20 text-node-switch bg-node-switch/[0.12]',
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-[bridge-badge-pulse-dot_2s_ease-in-out_infinite]" />
            <span>
              {isDev ? 'Developer Perspective' : 'Business Perspective'}
            </span>
          </div>
          <h1 className="font-serif text-[26px] sm:text-[32px] font-normal tracking-[-0.01em] leading-[1.15] mb-1.5 text-fg">
            Decision Tables
          </h1>
          <p className="text-sm leading-normal text-fg-secondary max-w-[520px]">
            {isDev
              ? 'Zero developer code for decision logic. GoRules ZEN evaluates tables natively at runtime.'
              : 'Define routing rules in a spreadsheet. No code, no developer needed.'}
          </p>
        </div>

        {/* Views */}
        <div ref={viewsRef} className="relative overflow-hidden w-full mt-5 transition-[height] duration-500 ease-out-expo">
          {/* BUSINESS VIEW */}
          <div
            ref={bizViewRef}
            className={cn(
              'absolute top-0 inset-x-0 px-5 pb-5 sm:px-8 sm:pb-7 transition-all duration-500 ease-out-expo',
              isDev ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0',
            )}
          >
            <div className="flex items-center gap-3 mb-3 overflow-x-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-node-switch/[0.15] rounded-lg">
                <span className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.08em]">
                  Hit Policy
                </span>
              </div>
              <div className="flex gap-0.5">
                {['first', 'collect', 'all', 'priority'].map((policy) => (
                  <button
                    key={policy}
                    className={cn(
                      'px-2 py-[3px] rounded font-mono text-[10px] text-fg-muted cursor-pointer transition-all duration-200 border border-transparent',
                      hitPolicy === policy && 'text-node-switch bg-node-switch/10 border-node-switch/20',
                    )}
                    onClick={() => setHitPolicy(policy)}
                  >
                    {policy.charAt(0).toUpperCase() + policy.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full border-separate border-spacing-0 rounded-xl overflow-hidden border border-node-switch/10 min-w-[480px]">
              <thead>
                <tr>
                  <th className="w-9 text-center text-[10px] text-fg-muted px-4 py-2.5 font-mono font-medium uppercase tracking-[0.1em] text-node-switch bg-node-switch/[0.08] border-b border-node-switch/[0.12]">
                    #
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-node-action bg-node-action/[0.06] text-left border-b border-node-switch/[0.12]">
                    Tier
                    <span className="block text-[9px] text-fg-muted font-normal mt-0.5 tracking-[0.06em]">
                      input
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-node-action bg-node-action/[0.06] text-left border-b border-node-switch/[0.12]">
                    Value
                    <span className="block text-[9px] text-fg-muted font-normal mt-0.5 tracking-[0.06em]">
                      input
                    </span>
                  </th>
                  <th className="px-4 py-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-node-terminal bg-node-terminal/[0.06] text-left border-b border-node-switch/[0.12]">
                    Route
                    <span className="block text-[9px] text-fg-muted font-normal mt-0.5 tracking-[0.06em]">
                      output
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DECISION_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'transition-colors duration-200 hover:bg-node-switch/[0.06]',
                      i % 2 === 0 ? 'bg-[rgba(26,15,10,0.8)]' : 'bg-[rgba(34,21,16,0.6)]',
                    )}
                  >
                    <td className="w-9 text-center text-[10px] text-fg-muted px-4 py-2.5 font-mono border-b border-white/[0.04] border-r border-white/[0.03]">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-fg border-b border-white/[0.04] border-r border-white/[0.03]">
                      <span className="py-0.5 px-1.5 rounded text-node-action">
                        {row.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-fg border-b border-white/[0.04] border-r border-white/[0.03]">
                      <span className={cn('py-0.5 px-1.5 rounded', VALUE_CLASSES[row.valueClass])}>
                        {row.value}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-fg border-b border-white/[0.04]">
                      <span className="py-0.5 px-1.5 rounded text-node-terminal">
                        {row.route}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="flex items-center gap-2 mt-3.5 text-xs text-fg-muted">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-node-switch/[0.08] text-node-switch font-mono text-[10px] font-medium">
                {policyInfo.icon}
              </span>
              <span>{policyInfo.text}</span>
            </div>
          </div>

          {/* DEVELOPER VIEW */}
          <div
            ref={devViewRef}
            className={cn(
              'absolute top-0 inset-x-0 px-5 pb-5 sm:px-8 sm:pb-7 transition-all duration-500 ease-out-expo',
              isDev ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none',
            )}
          >
            <div className="flex items-center justify-center gap-0 min-h-[200px] relative overflow-x-auto">
              {/* Input JSON */}
              <div
                ref={inputJsonRef}
                className="flow-json flow-json--input shrink-0 basis-[180px] bg-code-bg border border-white/[0.06] rounded-[10px] px-4 py-3.5 font-mono text-xs leading-relaxed relative z-[2] transition-[border-color,box-shadow] duration-[400ms]"
              >
                <span className="text-fg-muted">{'{'}</span>
                <br />
                &nbsp;&nbsp;
                <span className="text-node-action">tier</span>
                <span className="text-fg-muted">:</span>{' '}
                <span className="text-string-amber">{inputTier}</span>
                <span className="text-fg-muted">,</span>
                <br />
                &nbsp;&nbsp;
                <span className="text-node-action">value</span>
                <span className="text-fg-muted">:</span>{' '}
                <span className="text-type-teal">{inputValue}</span>
                <br />
                <span className="text-fg-muted">{'}'}</span>
              </div>

              {/* Arrow in */}
              <div className="shrink-0 basis-10 flex items-center justify-center relative z-[1]">
                <svg width="40" height="20" viewBox="0 0 40 20" className="overflow-visible">
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
                <div className="flow-particle" ref={particleInRef} />
              </div>

              {/* Decision Table */}
              <div className="shrink-0 basis-[260px] relative z-[2]">
                <table className="flow-table w-full border-separate border-spacing-0 rounded-[10px] overflow-hidden border border-node-switch/10 font-mono text-[11px]">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-[9px] font-medium uppercase tracking-[0.1em] text-node-switch bg-node-switch/[0.08] text-left border-b border-node-switch/[0.12]">
                        Tier
                      </th>
                      <th className="px-3 py-2 text-[9px] font-medium uppercase tracking-[0.1em] text-node-switch bg-node-switch/[0.08] text-left border-b border-node-switch/[0.12]">
                        Value
                      </th>
                      <th className="px-3 py-2 text-[9px] font-medium uppercase tracking-[0.1em] text-node-switch bg-node-switch/[0.08] text-left border-b border-node-switch/[0.12]">
                        Route
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DECISION_ROWS.map((row, i) => (
                      <tr
                        key={i}
                        className={cn(
                          'transition-all duration-[400ms]',
                          i % 2 === 0 ? 'bg-[rgba(26,15,10,0.8)]' : 'bg-[rgba(34,21,16,0.6)]',
                        )}
                      >
                        <td className="px-3 py-2 text-fg-secondary border-b border-white/[0.03] transition-all duration-[400ms]">
                          {row.tier}
                        </td>
                        <td className="px-3 py-2 text-fg-secondary border-b border-white/[0.03] transition-all duration-[400ms]">
                          {row.value}
                        </td>
                        <td className="px-3 py-2 text-fg-secondary border-b border-white/[0.03] transition-all duration-[400ms]">
                          {row.route}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Arrow out */}
              <div className="shrink-0 basis-10 flex items-center justify-center relative z-[1]">
                <svg width="40" height="20" viewBox="0 0 40 20" className="overflow-visible">
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
                <div className="flow-particle" ref={particleOutRef} />
              </div>

              {/* Output JSON */}
              <div
                ref={outputJsonRef}
                className="flow-json flow-json--output shrink-0 basis-[180px] bg-code-bg border border-white/[0.06] rounded-[10px] px-4 py-3.5 font-mono text-xs leading-relaxed relative z-[2] transition-[border-color,box-shadow] duration-[400ms]"
              >
                <span className="text-fg-muted">{'{'}</span>
                <br />
                &nbsp;&nbsp;
                <span className="text-node-action">route</span>
                <span className="text-fg-muted">:</span>{' '}
                <span className="text-string-amber">{outputRoute}</span>
                <br />
                <span className="text-fg-muted">{'}'}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 mt-3.5 px-3 py-[5px] rounded-md bg-accent/[0.06] border border-accent/[0.12] font-mono text-[10px] text-fg-muted tracking-[0.04em]">
              Powered by <span className="text-accent font-medium">GoRules ZEN</span> — native decision table
              evaluation at runtime
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
