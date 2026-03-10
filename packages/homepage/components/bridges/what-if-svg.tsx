import type React from 'react'
import type { FlowSvgProps, RippleObj } from './simulation-data'

export interface WhatIfSvgProps extends FlowSvgProps {
  isActive: boolean
  wiRipples: RippleObj[]
  fraudNodeStyle: React.CSSProperties
  fraudNodeRectStyle: React.CSSProperties
  investigateEdgesOpacity: number
  investigateLabelOpacity: number
  errorTooltipVisible: boolean
}

export function WhatIfSvg({
  getNodeClassName,
  getEdgeClassName,
  isActive,
  wiRipples,
  fraudNodeStyle,
  fraudNodeRectStyle,
  investigateEdgesOpacity,
  investigateLabelOpacity,
  errorTooltipVisible,
}: WhatIfSvgProps) {
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
      <line className={`edge${getEdgeClassName('wi-edge-file-evidence')}`} x1="238" y1="58" x2="390" y2="58" markerEnd="url(#wi-arrow)"/>
      <line className={`edge${getEdgeClassName('wi-edge-evidence-review')}`} x1="430" y1="73" x2="430" y2="167" markerEnd="url(#wi-arrow)"/>
      <line className={`edge${getEdgeClassName('wi-edge-review-assess')}`} x1="468" y1="182" x2="600" y2="182" markerEnd="url(#wi-arrow)"/>
      <line className={`edge${getEdgeClassName('wi-edge-assess-approve-v')}`} x1="630" y1="197" x2="630" y2="310" markerEnd="url(#wi-arrow)"/>
      <line className={`edge${getEdgeClassName('wi-edge-assess-investigate-h')}`} x1="680" y1="182" x2="780" y2="182" style={{ opacity: investigateEdgesOpacity, transition: 'opacity 0.4s ease' }}/>
      <line className={`edge${getEdgeClassName('wi-edge-assess-investigate-v')}`} x1="780" y1="182" x2="780" y2="310" markerEnd="url(#wi-arrow)" style={{ opacity: investigateEdgesOpacity, transition: 'opacity 0.4s ease' }}/>
      <line className={`edge${getEdgeClassName('wi-edge-payout-issue')}`} x1="587" y1="325" x2="360" y2="325" markerEnd="url(#wi-arrow)"/>
      <line className={`edge${getEdgeClassName('wi-edge-issue-end')}`} x1="280" y1="325" x2="143" y2="325" markerEnd="url(#wi-arrow)"/>

      {/* Edge labels */}
      <text className="edge-label" x="635" y="255">approve</text>
      <text className="edge-label" x="720" y="170" style={{ opacity: investigateLabelOpacity, transition: 'opacity 0.4s ease' }}>investigate</text>

      {/* ALL nodes */}
      {/* File Claim (action) */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-file')}`} data-cx="200" data-cy="58" transform="translate(200,58)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">File Claim</text>
      </g>
      {/* Submit Evidence (action) */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-evidence')}`} data-cx="430" data-cy="58" transform="translate(430,58)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Submit Evidence</text>
      </g>
      {/* Review Claim (action) */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-review')}`} data-cx="430" data-cy="182" transform="translate(430,182)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Review Claim</text>
      </g>
      {/* Assess Damage (switch) */}
      <g className={`node-group ntype-switch${getNodeClassName('wi-node-assess')}`} data-cx="640" data-cy="182" transform="translate(640,182)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
        <text className="node-label" x="0" y="6">Assess</text>
      </g>
      {/* Calculate Payout (action) */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-payout')}`} data-cx="630" data-cy="325" transform="translate(630,325)">
        <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Calculate Payout</text>
      </g>
      {/* Issue Payment (action) */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-issue')}`} data-cx="320" data-cy="325" transform="translate(320,325)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Issue Payment</text>
      </g>
      {/* End (terminal) */}
      <g className={`node-group ntype-terminal${getNodeClassName('wi-node-end')}`} data-cx="130" data-cy="325" transform="translate(130,325)">
        <circle className="node-circle" cx="0" cy="0" r="13"/>
        <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
      </g>
      {/* Fraud Check (action) — investigate path, hidden by default */}
      <g className={`node-group ntype-action${getNodeClassName('wi-node-fraud')}`} data-cx="780" data-cy="325" style={fraudNodeStyle} transform="translate(780,325)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={fraudNodeRectStyle}/>
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
      <g className={`error-tooltip${errorTooltipVisible ? ' visible' : ''}`}>
        <rect x="660" y="348" width="250" height="22" rx="5"/>
        <text x="670" y="362"><tspan className="tt-icon">{'\u26A0'}</tspan> Alert: Suspicious pattern — duplicate claim #CLM-7829</text>
      </g>
    </svg>
  )
}
