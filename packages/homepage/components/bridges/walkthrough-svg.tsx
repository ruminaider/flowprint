import type { FlowSvgProps, RippleObj } from './simulation-data'

export interface WalkthroughSvgProps extends FlowSvgProps {
  isActive: boolean
  wtRipples: RippleObj[]
}

export function WalkthroughSvg({ getNodeClassName, getEdgeClassName, isActive, wtRipples }: WalkthroughSvgProps) {
  return (
    <svg className={`flow-svg${isActive ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
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
  )
}
