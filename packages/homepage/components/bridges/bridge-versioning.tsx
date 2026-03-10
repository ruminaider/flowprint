'use client'

import { useState, useEffect, useRef } from 'react'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'
import '../flow/flow.css'
import './bridge-shared.css'
import './bridge-versioning.css'

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
  approve:  { x: 330, y: 210, hidden: true },  // hidden, same spot as validate
  route:    { x: 460, y: 210 },
  ship:     { x: 560, y: 350 },
  notify:   { x: 560, y: 350, hidden: true },  // hidden, same spot as ship
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

// Edge path helper
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

  // If same row, draw straight
  if (Math.abs(fromY - toY) < 5) {
    return `M ${startX} ${fromY} L ${endX} ${toY}`
  }

  // Otherwise draw a smooth curve
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
    // When hidden, compute paths from same positions so transitions animate smoothly
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

  const approveClasses = [
    'node-group',
    state.approve?.hidden ? 'node-entering' : 'visible',
    !state.approve?.hidden ? 'node-added' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const notifyClasses = [
    'node-group',
    state.notify?.hidden ? 'node-entering' : 'visible',
    !state.notify?.hidden ? 'node-added' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shipClasses = ['node-group', isAfterState ? 'node-changed' : ''].filter(Boolean).join(' ')

  const svgClasses = ['flow-svg', isAfterState ? 'show-changes' : ''].filter(Boolean).join(' ')

  return (
    <>
      <div className="flow-container">
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

          {/* EDGES (drawn first, behind nodes) */}
          {/* Start -> Submit */}
          <path className="edge" d={edges.startSubmit} />
          {/* Submit -> Validate */}
          <path className="edge" d={edges.submitValidate} />
          {/* Validate -> Approve (after state only) */}
          <path
            className={`edge ${isAfterState ? 'visible' : 'edge-entering'}`}
            d={edges.validateApprove}
          />
          {/* Validate -> Route / Approve -> Route */}
          <path className="edge" d={edges.toRoute} />
          {/* Route -> Ship */}
          <path className="edge" d={edges.routeShip} />
          {/* Ship -> Notify (after state only) */}
          <path
            className={`edge ${isAfterState ? 'visible' : 'edge-entering'}`}
            d={edges.shipNotify}
          />
          {/* Ship/Notify -> End */}
          <path className="edge" d={edges.toEnd} />

          {/* NODES */}
          {/* Start (terminal) */}
          <g className="node-group" transform={`translate(${state.start.x}, ${state.start.y})`}>
            <circle className="node-circle" cx={0} cy={0} r={13} />
            <text className="node-label" x={0} y={0} fontSize="8.5">Start</text>
          </g>

          {/* Submit (action) */}
          <g className="node-group" transform={`translate(${state.submit.x}, ${state.submit.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30}
                  style={{ stroke: 'rgba(255,146,67,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#FF9243">ACTION</text>
            <text className="node-label" x={0} y={6}>Submit</text>
          </g>

          {/* Validate (action) */}
          <g className="node-group" transform={`translate(${state.validate.x}, ${state.validate.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30}
                  style={{ stroke: 'rgba(228,70,255,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#E446FF">ACTION</text>
            <text className="node-label" x={0} y={6}>Validate</text>
          </g>

          {/* Approve (action, new in "after") */}
          <g className={approveClasses} transform={`translate(${state.approve.x}, ${state.approve.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30}
                  style={{ stroke: 'rgba(228,70,255,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#E446FF">ACTION</text>
            <text className="node-label" x={0} y={6}>Approve</text>
            <text className="change-badge" x={0} y={-30} fill="#3FDC77">+ NEW</text>
          </g>

          {/* Route (switch) */}
          <g className="node-group" transform={`translate(${state.route.x}, ${state.route.y})`}>
            <rect className="node-rect" x={-40} y={-15} width={80} height={30}
                  style={{ stroke: 'rgba(163,116,255,0.3)' }} rx={4} ry={4} />
            <text className="node-type-badge" x={0} y={-6} fill="#A374FF">SWITCH</text>
            <text className="node-label" x={0} y={6}>Route Order</text>
          </g>

          {/* Ship (action, label changes) */}
          <g className={shipClasses} transform={`translate(${state.ship.x}, ${state.ship.y})`}>
            <rect className="node-rect" x={-43} y={-15} width={86} height={30}
                  style={{ stroke: 'rgba(6,182,212,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#06B6D4">ACTION</text>
            <text className="node-label" x={0} y={6}>{state.shipLabel}</text>
            <text className="change-badge" x={0} y={-30} fill="#FF9243">~ CHANGED</text>
          </g>

          {/* Notify (action, new in "after") */}
          <g className={notifyClasses} transform={`translate(${state.notify.x}, ${state.notify.y})`}>
            <rect className="node-rect" x={-38} y={-15} width={76} height={30}
                  style={{ stroke: 'rgba(6,182,212,0.3)' }} />
            <text className="node-type-badge" x={0} y={-6} fill="#06B6D4">ACTION</text>
            <text className="node-label" x={0} y={6}>Notify</text>
            <text className="change-badge" x={0} y={-30} fill="#3FDC77">+ NEW</text>
          </g>

          {/* End (terminal) */}
          <g className="node-group" transform={`translate(${state.end.x}, ${state.end.y})`}>
            <circle className="node-circle" cx={0} cy={0} r={13} />
            <text className="node-label" x={0} y={0} fontSize="8.5">End</text>
          </g>
        </svg>
      </div>
      <div className="state-label">{isAfterState ? 'After' : 'Before'}</div>
    </>
  )
}

function DeveloperViewContent() {
  return (
    <>
      <div className="dev-content">
        <div className="dev-section diff-section">
          <div className="dev-section-header">
            <span className="icon">&#128221;</span>
            <span>Git Diff</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
              order-fulfillment.flowprint.yaml
            </span>
          </div>
          <div className="diff-body">
            <div className="diff-line context">{'  '}<span className="key">validate</span>:</div>
            <div className="diff-line removed"><span className="minus">-</span>{'   '}<span className="key">next</span>: <span className="str">route_order</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">next</span>: <span className="str">approve</span></div>
            <div className="diff-line added"><span className="plus">+</span>{' '}<span className="key">approve</span>:</div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">type</span>: <span className="str">action</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">lane</span>: <span className="str">routing</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">next</span>: <span className="str">route_order</span></div>
            <div className="diff-line context">{'  '}<span className="key">route_order</span>:</div>
            <div className="diff-line context">{'    '}<span className="key">type</span>: <span className="str">switch</span></div>
            <div className="diff-line context">{'  '}<span className="key">ship_standard</span>:</div>
            <div className="diff-line removed"><span className="minus">-</span>{'   '}<span className="key">label</span>: <span className="str">Ship Standard</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">label</span>: <span className="str">Ship Priority</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">next</span>: <span className="str">notify</span></div>
            <div className="diff-line added"><span className="plus">+</span>{' '}<span className="key">notify</span>:</div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">type</span>: <span className="str">action</span></div>
            <div className="diff-line added"><span className="plus">+</span>{'   '}<span className="key">lane</span>: <span className="str">fulfillment</span></div>
          </div>
        </div>

        <div className="dev-section ci-section">
          <div className="dev-section-header">
            <span className="icon">&#9881;</span>
            <span>CI Validation</span>
            <span style={{ marginLeft: 'auto', color: '#5ae07a' }}>All checks passed</span>
          </div>
          <div className="ci-body">
            <div className="ci-line">
              <span className="ci-check">&#10004;</span>
              <span className="ci-text">Schema valid (<span className="ci-highlight">flowprint/1.0</span>)</span>
            </div>
            <div className="ci-line">
              <span className="ci-check">&#10004;</span>
              <span className="ci-text">No dangling refs</span>
            </div>
            <div className="ci-line">
              <span className="ci-check">&#10004;</span>
              <span className="ci-text">No cycles detected</span>
            </div>
            <div className="ci-line">
              <span className="ci-check">&#10004;</span>
              <span className="ci-text">Deterministic key order</span>
            </div>
            <div className="ci-line">
              <span className="ci-check">&#10004;</span>
              <span className="ci-text">
                <span className="ci-highlight">8</span> nodes validated (was{' '}
                <span style={{ color: 'var(--text-muted)' }}>6</span>)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function BridgeVersioning({ perspective }: BridgeVersioningProps) {
  const isDev = perspective === 'developer'
  const [isAfterState, setIsAfterState] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const { containerRef: viewsRef, bizRef: bizViewRef, devRef: devViewRef } = useDynamicHeight(isDev)

  // Morph loop: schedule next state flip as a reaction to current state.
  // No side effects inside setState updaters — React Strict Mode calls them twice.
  useEffect(() => {
    // First render: 2s initial delay. Subsequent: 3s for "after", 2.5s for "before".
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

  const wrapperClasses = [
    'bridge-versioning',
    perspective === 'developer' ? 'developer' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses}>
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
          <h2 className="title">Version Control</h2>
          <p className="description">
            {isDev
              ? 'YAML diffs cleanly. Validate in CI. Catch issues in PR review.'
              : 'See exactly what changed, visually. No YAML to read.'}
          </p>
        </div>

        {/* Views */}
        <div ref={viewsRef} className="views">
          <div ref={bizViewRef} className="view view--business">
            <BusinessViewContent isAfterState={isAfterState} />
          </div>
          <div ref={devViewRef} className="view view--developer">
            <DeveloperViewContent />
          </div>
        </div>
      </div>
    </div>
  )
}
