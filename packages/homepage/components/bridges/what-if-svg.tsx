import type { RippleObj } from './simulation-data'

export interface WhatIfSvgProps {
  isActive: boolean
  wiRipples: RippleObj[]
}

export function WhatIfSvg({ isActive, wiRipples }: WhatIfSvgProps) {
  return (
    <svg className={`flow-svg${isActive ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
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
      <line data-edge-id="wi-edge-file-evidence" className="edge" x1="238" y1="58" x2="390" y2="58" markerEnd="url(#wi-arrow)"/>
      <line data-edge-id="wi-edge-evidence-review" className="edge" x1="430" y1="73" x2="430" y2="167" markerEnd="url(#wi-arrow)"/>
      <line data-edge-id="wi-edge-review-assess" className="edge" x1="468" y1="182" x2="600" y2="182" markerEnd="url(#wi-arrow)"/>
      <line data-edge-id="wi-edge-assess-approve-v" className="edge" x1="630" y1="197" x2="630" y2="310" markerEnd="url(#wi-arrow)"/>
      <line data-edge-id="wi-edge-assess-investigate-h" className="edge" x1="680" y1="182" x2="780" y2="182" style={{ opacity: 0, transition: 'opacity 0.4s ease' }}/>
      <line data-edge-id="wi-edge-assess-investigate-v" className="edge" x1="780" y1="182" x2="780" y2="310" markerEnd="url(#wi-arrow)" style={{ opacity: 0, transition: 'opacity 0.4s ease' }}/>
      <line data-edge-id="wi-edge-payout-issue" className="edge" x1="587" y1="325" x2="360" y2="325" markerEnd="url(#wi-arrow)"/>
      <line data-edge-id="wi-edge-issue-end" className="edge" x1="280" y1="325" x2="143" y2="325" markerEnd="url(#wi-arrow)"/>

      {/* Edge labels */}
      <text className="edge-label" x="635" y="255">approve</text>
      <text data-edge-label="investigate" className="edge-label" x="720" y="170" style={{ opacity: 0, transition: 'opacity 0.4s ease' }}>investigate</text>

      {/* ALL nodes */}
      {/* File Claim (action) */}
      <g data-node-id="wi-node-file" className="node-group ntype-action" data-cx="200" data-cy="58" transform="translate(200,58)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">File Claim</text>
      </g>
      {/* Submit Evidence (action) */}
      <g data-node-id="wi-node-evidence" className="node-group ntype-action" data-cx="430" data-cy="58" transform="translate(430,58)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Submit Evidence</text>
      </g>
      {/* Review Claim (action) */}
      <g data-node-id="wi-node-review" className="node-group ntype-action" data-cx="430" data-cy="182" transform="translate(430,182)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Review Claim</text>
      </g>
      {/* Assess Damage (switch) */}
      <g data-node-id="wi-node-assess" className="node-group ntype-switch" data-cx="640" data-cy="182" transform="translate(640,182)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
        <text className="node-label" x="0" y="6">Assess</text>
      </g>
      {/* Calculate Payout (action) */}
      <g data-node-id="wi-node-payout" className="node-group ntype-action" data-cx="630" data-cy="325" transform="translate(630,325)">
        <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Calculate Payout</text>
      </g>
      {/* Issue Payment (action) */}
      <g data-node-id="wi-node-issue" className="node-group ntype-action" data-cx="320" data-cy="325" transform="translate(320,325)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Issue Payment</text>
      </g>
      {/* End (terminal) */}
      <g data-node-id="wi-node-end" className="node-group ntype-terminal" data-cx="130" data-cy="325" transform="translate(130,325)">
        <circle className="node-circle" cx="0" cy="0" r="13"/>
        <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
      </g>
      {/* Fraud Check (action) — investigate path, hidden by default */}
      <g data-node-id="wi-node-fraud" className="node-group ntype-action" data-cx="780" data-cy="325" style={{ opacity: 0, transformOrigin: '780px 325px', transform: 'scale(0)' }} transform="translate(780,325)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
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
      <g data-tooltip-id="wi-error-tooltip" className="error-tooltip">
        <rect x="660" y="348" width="250" height="22" rx="5"/>
        <text x="670" y="362"><tspan className="tt-icon">{'\u26A0'}</tspan> Alert: Suspicious pattern — duplicate claim #CLM-7829</text>
      </g>
    </svg>
  )
}
