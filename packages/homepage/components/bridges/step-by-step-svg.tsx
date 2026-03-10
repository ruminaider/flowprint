import type { FlowSvgProps, RippleObj } from './simulation-data'

export interface StepByStepSvgProps extends FlowSvgProps {
  isActive: boolean
  isTooltipVisible: (id: string) => boolean
  sbRipples: RippleObj[]
}

export function StepByStepSvg({ getNodeClassName, getEdgeClassName, isActive, isTooltipVisible, sbRipples }: StepByStepSvgProps) {
  return (
    <svg className={`flow-svg${isActive ? ' active-svg' : ''}`} viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="sb-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40"/>
        </marker>
        <marker id="sb-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0.5, 8 3, 0 5.5" fill="#3FDC77"/>
        </marker>
      </defs>

      {/* Lane backgrounds */}
      <rect className="lane-bg-rect" x="4" y="4" width="892" height="108" rx="8"/>
      <rect className="lane-bg-rect" x="4" y="118" width="892" height="128" rx="8"/>
      <rect className="lane-bg-rect" x="4" y="252" width="892" height="144" rx="8"/>

      {/* Lane labels */}
      <text className="lane-label" x="16" y="62">APPLICANT</text>
      <text className="lane-label" x="16" y="186">UNDERWRITING</text>
      <text className="lane-label" x="16" y="328">OPERATIONS</text>

      {/* ALL edges */}
      <line className={`edge${getEdgeClassName('sb-edge-submit-upload')}`} x1="245" y1="58" x2="385" y2="58" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-upload-credit')}`} x1="430" y1="73" x2="430" y2="167" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-credit-risk')}`} x1="468" y1="182" x2="600" y2="182" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-risk-approved-v')}`} x1="640" y1="197" x2="640" y2="305" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-risk-denied-h')}`} x1="680" y1="182" x2="780" y2="182"/>
      <line className={`edge${getEdgeClassName('sb-edge-risk-denied-v')}`} x1="780" y1="182" x2="780" y2="305" markerEnd="url(#sb-arrow)"/>
      <path className={`edge${getEdgeClassName('sb-edge-risk-review-h')}`} d="M600 197 L480 250 L340 250"/>
      <line className={`edge${getEdgeClassName('sb-edge-risk-review-v')}`} x1="340" y1="250" x2="340" y2="305" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-offer-disburse')}`} x1="640" y1="335" x2="560" y2="365" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-disburse-end')}`} x1="517" y1="380" x2="173" y2="380" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-reject-end-h')}`} x1="780" y1="335" x2="780" y2="380"/>
      <line className={`edge${getEdgeClassName('sb-edge-reject-end-v')}`} x1="780" y1="380" x2="173" y2="380" markerEnd="url(#sb-arrow)"/>
      <path className={`edge${getEdgeClassName('sb-edge-manual-risk-v')}`} d="M300 305 L300 155 L640 155 L640 167" markerEnd="url(#sb-arrow)"/>
      <line className={`edge${getEdgeClassName('sb-edge-manual-risk-h')}`} x1="0" y1="0" x2="0" y2="0" style={{ opacity: 0 }}/>

      {/* Edge labels */}
      <text className="edge-label" x="645" y="255">approved</text>
      <text className="edge-label" x="720" y="170">denied</text>
      <text className="edge-label" x="460" y="242">review</text>

      {/* ALL nodes */}
      {/* Submit Application (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-submit')}`} data-cx="200" data-cy="58" transform="translate(200,58)">
        <rect className="node-rect" x="-45" y="-15" width="90" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Submit Application</text>
      </g>
      {/* Upload Documents (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-upload')}`} data-cx="430" data-cy="58" transform="translate(430,58)">
        <rect className="node-rect" x="-45" y="-15" width="90" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Upload Documents</text>
      </g>
      {/* Credit Check (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-credit')}`} data-cx="430" data-cy="182" transform="translate(430,182)">
        <rect className="node-rect" x="-38" y="-15" width="76" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Credit Check</text>
      </g>
      {/* Risk Assessment (switch) */}
      <g className={`node-group ntype-switch${getNodeClassName('sb-node-risk')}`} data-cx="640" data-cy="182" transform="translate(640,182)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(163,116,255,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
        <text className="node-label" x="0" y="6">Risk</text>
      </g>
      {/* Generate Offer (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-offer')}`} data-cx="640" data-cy="320" transform="translate(640,320)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Generate Offer</text>
      </g>
      {/* Disburse Funds (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-disburse')}`} data-cx="560" data-cy="380" transform="translate(560,380)">
        <rect className="node-rect" x="-43" y="-15" width="86" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Disburse Funds</text>
      </g>
      {/* Send Rejection (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-reject')}`} data-cx="780" data-cy="320" transform="translate(780,320)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Send Rejection</text>
      </g>
      {/* Manual Review (action) */}
      <g className={`node-group ntype-action${getNodeClassName('sb-node-manual')}`} data-cx="340" data-cy="320" transform="translate(340,320)">
        <rect className="node-rect" x="-40" y="-15" width="80" height="30" style={{ stroke: 'rgba(255,146,67,0.3)' }}/>
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
        <text className="node-label" x="0" y="6">Manual Review</text>
      </g>
      {/* End (terminal) */}
      <g className={`node-group ntype-terminal${getNodeClassName('sb-node-end')}`} data-cx="160" data-cy="380" transform="translate(160,380)">
        <circle className="node-circle" cx="0" cy="0" r="13"/>
        <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
      </g>

      {/* Ripple layer */}
      <g>
        {sbRipples.map(r => (
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

      {/* Data tooltips for step-by-step mode */}
      <g className={`data-tooltip${isTooltipVisible('tt-sb-submit') ? ' visible' : ''}`}>
        <rect x="130" y="14" width="180" height="28" rx="5"/>
        <text x="138" y="28"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ applicant: "Jane Doe" }`}</tspan></text>
        <text x="138" y="38"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ appId: "LN-8834" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-upload') ? ' visible' : ''}`}>
        <rect x="510" y="34" width="210" height="28" rx="5"/>
        <text x="518" y="48"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ docs: ["W2", "bank_stmt"] }`}</tspan></text>
        <text x="518" y="58"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ verified: true, score: 0.94 }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-credit') ? ' visible' : ''}`}>
        <rect x="500" y="157" width="210" height="28" rx="5"/>
        <text x="508" y="171"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ ssn: "***-**-4821" }`}</tspan></text>
        <text x="508" y="181"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ creditScore: 742, tier: "A" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-risk') ? ' visible' : ''}`}>
        <rect x="686" y="160" width="200" height="28" rx="5"/>
        <text x="694" y="174"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ score: 742, amount: $85K }`}</tspan></text>
        <text x="694" y="184"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ decision: "approved" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-offer') ? ' visible' : ''}`}>
        <rect x="700" y="296" width="185" height="28" rx="5"/>
        <text x="708" y="310"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ rate: 5.2%, term: 30yr }`}</tspan></text>
        <text x="708" y="320"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ offerId: "OFF-1192" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-disburse') ? ' visible' : ''}`}>
        <rect x="640" y="363" width="195" height="28" rx="5"/>
        <text x="648" y="377"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ amount: $85,000 }`}</tspan></text>
        <text x="648" y="387"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ txId: "ACH-5510", ok: true }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-reject') ? ' visible' : ''}`}>
        <rect x="710" y="270" width="170" height="28" rx="5"/>
        <text x="718" y="284"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ reason: "DTI > 43%" }`}</tspan></text>
        <text x="718" y="294"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ letter: "REJ-4410" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-manual') ? ' visible' : ''}`}>
        <rect x="270" y="270" width="190" height="28" rx="5"/>
        <text x="278" y="284"><tspan className="tt-heading">In:</tspan> <tspan className="tt-val">{`{ flag: "income_mismatch" }`}</tspan></text>
        <text x="278" y="294"><tspan className="tt-heading">Out:</tspan> <tspan className="tt-val">{`{ override: "approve" }`}</tspan></text>
      </g>
      <g className={`data-tooltip${isTooltipVisible('tt-sb-end') ? ' visible' : ''}`}>
        <rect x="120" y="340" width="100" height="20" rx="5"/>
        <text x="128" y="353"><tspan className="tt-heading">status:</tspan> <tspan className="tt-val">disbursed</tspan></text>
      </g>
    </svg>
  )
}
