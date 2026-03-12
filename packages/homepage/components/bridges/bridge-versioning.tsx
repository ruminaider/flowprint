'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
import '../flow/flow.css'
import './bridge-versioning-svg.css'

interface BridgeVersioningProps {
  perspective: 'business' | 'developer'
}

// Layout positions for nodes in "before" and "after" states
// SVG viewBox is 716 x 420
// Lanes: customer 0-140, routing 140-280, fulfillment 280-420
// Lane centers: customer 70, routing 210, fulfillment 350

interface NodePos {
  x: number
  y: number
  hidden?: boolean
}

interface LayoutState {
  start: NodePos
  submit: NodePos
  validate: NodePos
  approve: NodePos
  route: NodePos
  ship: NodePos
  notify: NodePos
  end: NodePos
  shipLabel: string
}

const BEFORE: LayoutState = {
  start:    { x: 70,  y: 70 },
  submit:   { x: 190, y: 70 },
  validate: { x: 330, y: 210 },
  approve:  { x: 330, y: 210, hidden: true },
  route:    { x: 460, y: 210 },
  ship:     { x: 560, y: 350 },
  notify:   { x: 560, y: 350, hidden: true },
  end:      { x: 660, y: 350 },
  shipLabel: 'Ship Standard',
}

const AFTER: LayoutState = {
  start:    { x: 60,  y: 70 },
  submit:   { x: 160, y: 70 },
  validate: { x: 270, y: 210 },
  approve:  { x: 380, y: 210, hidden: false },
  route:    { x: 490, y: 210 },
  ship:     { x: 540, y: 350 },
  notify:   { x: 630, y: 350, hidden: false },
  end:      { x: 690, y: 350 },
  shipLabel: 'Ship Priority',
}

// Diff line style constants
const DL = 'font-mono text-[11px] leading-[1.7] px-3.5 whitespace-pre'
const DL_ADD = 'bg-true-green/[0.08] text-true-green'
const DL_DEL = 'bg-false-red/[0.08] text-false-red'
const DL_CTX = 'text-fg-muted'

function edgePath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  fromR: number,
  toR: number,
): string {
  const startX = fromX + fromR
  const endX = toX - toR

  if (Math.abs(fromY - toY) < 5) {
    return `M ${startX} ${fromY} L ${endX} ${toY}`
  }

  const midX = (startX + endX) / 2
  return `M ${startX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${endX} ${toY}`
}

function computeEdges(s: LayoutState, isAfter: boolean) {
  const startSubmit = edgePath(s.start.x, s.start.y, s.submit.x, s.submit.y, 13, 38)
  const submitValidate = edgePath(s.submit.x, s.submit.y, s.validate.x, s.validate.y, 38, 38)
  const routeShip = edgePath(s.route.x, s.route.y, s.ship.x, s.ship.y, 40, 43)

  let validateApprove: string
  let toRoute: string
  let shipNotify: string
  let toEnd: string

  if (isAfter) {
    validateApprove = edgePath(s.validate.x, s.validate.y, s.approve.x, s.approve.y, 38, 38)
    toRoute = edgePath(s.approve.x, s.approve.y, s.route.x, s.route.y, 38, 40)
    shipNotify = edgePath(s.ship.x, s.ship.y, s.notify.x, s.notify.y, 43, 38)
    toEnd = edgePath(s.notify.x, s.notify.y, s.end.x, s.end.y, 38, 13)
  } else {
    validateApprove = edgePath(s.validate.x, s.validate.y, s.approve.x, s.approve.y, 38, 38)
    toRoute = edgePath(s.validate.x, s.validate.y, s.route.x, s.route.y, 38, 40)
    shipNotify = edgePath(s.ship.x, s.ship.y, s.notify.x, s.notify.y, 43, 38)
    toEnd = edgePath(s.ship.x, s.ship.y, s.end.x, s.end.y, 43, 13)
  }

  return { startSubmit, submitValidate, validateApprove, toRoute, routeShip, shipNotify, toEnd }
}

function BusinessViewContent({ isAfterState }: { isAfterState: boolean }) {
  const state = isAfterState ? AFTER : BEFORE
  const edges = computeEdges(state, isAfterState)

  const approveClasses = cn(
    'node-group',
    state.approve?.hidden ? 'node-entering' : 'visible',
    !state.approve?.hidden && 'node-added',
  )

  const notifyClasses = cn(
    'node-group',
    state.notify?.hidden ? 'node-entering' : 'visible',
    !state.notify?.hidden && 'node-added',
  )

  const shipClasses = cn('node-group', isAfterState && 'node-changed')
  const svgClasses = cn('flow-svg', isAfterState && 'show-changes')

  return (
    <>
      <div className="w-full flex items-center justify-center">
        <svg className={svgClasses} viewBox="0 0 716 420">
          <defs>
            <marker id="bv-arrowhead" markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
              <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40" />
            </marker>
            <marker id="bv-arrowhead-green" markerWidth={8} markerHeight={6} refX={7} refY={3} orient="auto">
              <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77" opacity={0.5} />
            </marker>
          </defs>

          {/* Lane backgrounds */}
          <rect x={0} y={0} width={716} height={140} fill="rgba(255,107,107,0.02)" rx={0} />
          <rect x={0} y={140} width={716} height={140} fill="rgba(228,70,255,0.02)" rx={0} />
          <rect x={0} y={280} width={716} height={140} fill="rgba(6,182,212,0.02)" rx={0} />

          {/* Lane labels */}
          <text className="lane-label" x={12} y={24} fill="#FF6B6B" opacity={0.6}>Customer</text>
          <text className="lane-label" x={12} y={164} fill="#E446FF" opacity={0.6}>Routing</text>
          <text className="lane-label" x={12} y={304} fill="#06B6D4" opacity={0.6}>Fulfillment</text>

          {/* Lane separators */}
          <line className="lane-sep" x1={0} y1={140} x2={716} y2={140} />
          <line className="lane-sep" x1={0} y1={280} x2={716} y2={280} />

          {/* EDGES */}
          <path className="edge" d={edges.startSubmit} />
          <path className="edge" d={edges.submitValidate} />
          <path className={cn('edge', isAfterState ? 'visible' : 'edge-entering')} d={edges.validateApprove} />
          <path className="edge" d={edges.toRoute} />
          <path className="edge" d={edges.routeShip} />
          <path className={cn('edge', isAfterState ? 'visible' : 'edge-entering')} d={edges.shipNotify} />
          <path className="edge" d={edges.toEnd} />

          {/* NODES */}
          <g className="node-group" transform={`translate(${state.start.x}, ${state.start.y})`}>
            <circle className="node-circle" cx={0} cy={0} r={13} />
            <text className="node-label" x={0} y={0} fontSize="8.5">Start</text>
          </g>

          <g className="node-group" transform={`translate(${state.submit.x}, ${state.submit.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30} style={{ stroke: 'rgba(255,146,67,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#FF9243">ACTION</text>
            <text className="node-label" x={0} y={6}>Submit</text>
          </g>

          <g className="node-group" transform={`translate(${state.validate.x}, ${state.validate.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30} style={{ stroke: 'rgba(228,70,255,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#E446FF">ACTION</text>
            <text className="node-label" x={0} y={6}>Validate</text>
          </g>

          <g className={approveClasses} transform={`translate(${state.approve.x}, ${state.approve.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30} style={{ stroke: 'rgba(228,70,255,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#E446FF">ACTION</text>
            <text className="node-label" x={0} y={6}>Approve</text>
            <text className="change-badge" x={0} y={-30} fill="#3FDC77">+ NEW</text>
          </g>

          <g className="node-group" transform={`translate(${state.route.x}, ${state.route.y})`}>
            <rect className="node-rect" x={-40} y={-15} width={80} height={30} style={{ stroke: 'rgba(163,116,255,0.3)' }} rx={4} ry={4} />
            <text className="node-type-badge" x={0} y={-6} fill="#A374FF">SWITCH</text>
            <text className="node-label" x={0} y={6}>Route Order</text>
          </g>

          <g className={shipClasses} transform={`translate(${state.ship.x}, ${state.ship.y})`}>
            <rect className="node-rect" x={-43} y={-15} width={86} height={30} style={{ stroke: 'rgba(6,182,212,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#06B6D4">ACTION</text>
            <text className="node-label" x={0} y={6}>{state.shipLabel}</text>
            <text className="change-badge" x={0} y={-30} fill="#FF9243">~ CHANGED</text>
          </g>

          <g className={notifyClasses} transform={`translate(${state.notify.x}, ${state.notify.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30} style={{ stroke: 'rgba(6,182,212,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#06B6D4">ACTION</text>
            <text className="node-label" x={0} y={6}>Notify</text>
            <text className="change-badge" x={0} y={-30} fill="#3FDC77">+ NEW</text>
          </g>

          <g className="node-group" transform={`translate(${state.end.x}, ${state.end.y})`}>
            <circle className="node-circle" cx={0} cy={0} r={13} />
            <text className="node-label" x={0} y={0} fontSize="8.5">End</text>
          </g>
        </svg>
      </div>
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-[0.08em] uppercase text-fg-muted opacity-60 transition-opacity duration-[400ms] pointer-events-none">
        {isAfterState ? 'After' : 'Before'}
      </div>
    </>
  )
}

function DeveloperViewContent() {
  return (
    <div className="flex flex-col gap-3.5">
      {/* Diff section */}
      <div className="bg-code-bg border border-[rgba(61,42,34,0.6)] rounded-[10px] overflow-hidden flex-1 min-h-0">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-surface-elevated border-b border-[rgba(61,42,34,0.4)] font-mono text-[10px] font-medium text-fg-muted tracking-[0.03em]">
          <span className="text-xs">&#128221;</span>
          <span>Git Diff</span>
          <span className="ml-auto text-fg-muted">
            order-fulfillment.flowprint.yaml
          </span>
        </div>
        <div className="py-2.5 overflow-y-auto max-h-[260px]">
          <div className={cn(DL, DL_CTX)}>{'  '}<span className="text-keyword-blue">validate</span>:</div>
          <div className={cn(DL, DL_DEL)}><span className="text-false-red">-</span>{'   '}<span className="text-keyword-blue">next</span>: <span className="text-string-amber">route_order</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">next</span>: <span className="text-string-amber">approve</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{' '}<span className="text-keyword-blue">approve</span>:</div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">type</span>: <span className="text-string-amber">action</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">lane</span>: <span className="text-string-amber">routing</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">next</span>: <span className="text-string-amber">route_order</span></div>
          <div className={cn(DL, DL_CTX)}>{'  '}<span className="text-keyword-blue">route_order</span>:</div>
          <div className={cn(DL, DL_CTX)}>{'    '}<span className="text-keyword-blue">type</span>: <span className="text-string-amber">switch</span></div>
          <div className={cn(DL, DL_CTX)}>{'  '}<span className="text-keyword-blue">ship_standard</span>:</div>
          <div className={cn(DL, DL_DEL)}><span className="text-false-red">-</span>{'   '}<span className="text-keyword-blue">label</span>: <span className="text-string-amber">Ship Standard</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">label</span>: <span className="text-string-amber">Ship Priority</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">next</span>: <span className="text-string-amber">notify</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{' '}<span className="text-keyword-blue">notify</span>:</div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">type</span>: <span className="text-string-amber">action</span></div>
          <div className={cn(DL, DL_ADD)}><span className="text-true-green">+</span>{'   '}<span className="text-keyword-blue">lane</span>: <span className="text-string-amber">fulfillment</span></div>
        </div>
      </div>

      {/* CI section */}
      <div className="bg-code-bg border border-[rgba(61,42,34,0.6)] rounded-[10px] overflow-hidden shrink-0">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-surface-elevated border-b border-[rgba(61,42,34,0.4)] font-mono text-[10px] font-medium text-fg-muted tracking-[0.03em]">
          <span className="text-xs">&#9881;</span>
          <span>CI Validation</span>
          <span className="ml-auto text-true-green">All checks passed</span>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="font-mono text-[11px] leading-[1.8] flex items-center gap-2">
            <span className="text-true-green">&#10004;</span>
            <span className="text-fg-secondary">Schema valid (<span className="text-fg font-medium">flowprint/1.0</span>)</span>
          </div>
          <div className="font-mono text-[11px] leading-[1.8] flex items-center gap-2">
            <span className="text-true-green">&#10004;</span>
            <span className="text-fg-secondary">No dangling refs</span>
          </div>
          <div className="font-mono text-[11px] leading-[1.8] flex items-center gap-2">
            <span className="text-true-green">&#10004;</span>
            <span className="text-fg-secondary">No cycles detected</span>
          </div>
          <div className="font-mono text-[11px] leading-[1.8] flex items-center gap-2">
            <span className="text-true-green">&#10004;</span>
            <span className="text-fg-secondary">Deterministic key order</span>
          </div>
          <div className="font-mono text-[11px] leading-[1.8] flex items-center gap-2">
            <span className="text-true-green">&#10004;</span>
            <span className="text-fg-secondary">
              <span className="text-fg font-medium">8</span> nodes validated (was{' '}
              <span className="text-fg-muted">6</span>)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BridgeVersioning({ perspective }: BridgeVersioningProps) {
  const isDev = perspective === 'developer'
  const [isAfterState, setIsAfterState] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const { containerRef: viewsRef, bizRef: bizViewRef, devRef: devViewRef } = useDynamicHeight(isDev)

  useEffect(() => {
    const delay = isFirstRender.current ? 2000 : (isAfterState ? 3000 : 2500)
    isFirstRender.current = false

    timerRef.current = setTimeout(() => {
      setIsAfterState((prev) => !prev)
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isAfterState])

  return (
    <div className="bridge-versioning">
      <div className="relative w-[min(780px,calc(100vw-48px))] max-w-full rounded-[20px] bg-surface border border-surface-border shadow-bridge-card overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 pt-7 relative z-10">
          <div className="inline-flex items-center rounded px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] mb-3 transition-all duration-[400ms] bg-accent/[0.08] text-accent border border-accent-dim">
            {isDev ? 'Developer Perspective' : 'Business Perspective'}
          </div>
          <h2 className="font-serif text-[32px] font-normal tracking-[-0.01em] leading-[1.1] mb-1.5 text-fg">
            Version Control
          </h2>
          <p className="text-sm leading-normal text-fg-secondary max-w-[500px] m-0">
            {isDev
              ? 'YAML diffs cleanly. Validate in CI. Catch issues in PR review.'
              : 'See exactly what changed, visually. No YAML to read.'}
          </p>
        </div>

        {/* Views */}
        <div ref={viewsRef} className="relative overflow-hidden w-full transition-[height] duration-500 ease-out-expo">
          <div
            ref={bizViewRef}
            className={cn(
              'absolute top-0 inset-x-0 pt-4 pb-6 transition-all duration-500 ease-out-expo',
              isDev ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0',
            )}
          >
            <BusinessViewContent isAfterState={isAfterState} />
          </div>
          <div
            ref={devViewRef}
            className={cn(
              'absolute top-0 inset-x-0 px-8 pt-4 pb-6 transition-all duration-500 ease-out-expo',
              isDev ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none',
            )}
          >
            <DeveloperViewContent />
          </div>
        </div>
      </div>
    </div>
  )
}
