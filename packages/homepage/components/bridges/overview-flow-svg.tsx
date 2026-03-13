export function OverviewFlowSvg() {
  return (
    <svg className="flow-svg" viewBox="0 0 700 270" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0.5, 8 3, 0 5.5" fill="#6b4d40" />
        </marker>

        {/* Hover gradient fills */}
        <linearGradient id="grad-customer-hover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(255, 107, 107)" stopOpacity="0.18" />
          <stop offset="45%" stopColor="rgb(255, 107, 107)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(255, 107, 107)" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="grad-routing-hover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(228, 70, 255)" stopOpacity="0.18" />
          <stop offset="45%" stopColor="rgb(228, 70, 255)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(228, 70, 255)" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="grad-fulfillment-hover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.18" />
          <stop offset="45%" stopColor="rgb(6, 182, 212)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0.01" />
        </linearGradient>

        {/* Radial inner glow */}
        <radialGradient id="glow-customer" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="rgb(255, 107, 107)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="rgb(255, 107, 107)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-routing" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="rgb(228, 70, 255)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="rgb(228, 70, 255)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow-fulfillment" cx="0.5" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* CUSTOMER Lane (y: 0-75) */}
      <g className="lane-group lane-customer">
        <rect className="lane-bg-rect" x="0" y="0" width="700" height="75" rx="8" />
        <rect className="lane-inner-glow" x="1" y="1" width="698" height="73" rx="7" fill="url(#glow-customer)" />
        <text className="lane-label" x="14" y="42">CUSTOMER</text>

        <g className="node-group node-type-terminal" transform="translate(136, 39)">
          <circle className="node-circle" cx="0" cy="0" r="13" />
          <text className="node-label" x="0" y="0" fontSize="8.5">Start</text>
        </g>

        <g className="node-group node-type-action" transform="translate(282, 39)">
          <rect className="node-rect" x="-40" y="-15" width="80" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Submit Order</text>
        </g>
      </g>

      {/* ROUTING Lane (y: 81-172) */}
      <g className="lane-group lane-routing">
        <rect className="lane-bg-rect" x="0" y="81" width="700" height="91" rx="8" />
        <rect className="lane-inner-glow" x="1" y="82" width="698" height="89" rx="7" fill="url(#glow-routing)" />
        <text className="lane-label" x="14" y="131">ROUTING</text>

        <text className="edge-label" x="518" y="118">express</text>
        <text className="edge-label" x="446" y="168">standard</text>
        <text className="edge-label" x="340" y="122">review</text>

        <path className="edge" d="M480 127 L562 127 L562 203" markerEnd="url(#arrow)" />
        <path className="edge" d="M440 142 L437 203" markerEnd="url(#arrow)" />
        <path className="edge" d="M400 131 L192 131" markerEnd="url(#arrow)" />

        <g className="node-group node-type-action" transform="translate(282, 109)">
          <rect className="node-rect" x="-40" y="-15" width="80" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Validate</text>
        </g>

        <g className="node-group node-type-switch" transform="translate(440, 127)">
          <rect className="node-rect" x="-40" y="-15" width="80" height="30"
                style={{ stroke: 'rgba(163,116,255,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#A374FF">SWITCH</text>
          <text className="node-label" x="0" y="6">Route</text>
        </g>

        <g className="node-group node-type-action" transform="translate(152, 131)">
          <rect className="node-rect" x="-40" y="-15" width="80" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Review</text>
        </g>
      </g>

      {/* FULFILLMENT Lane (y: 178-258) */}
      <g className="lane-group lane-fulfillment">
        <rect className="lane-bg-rect" x="0" y="178" width="700" height="80" rx="8" />
        <rect className="lane-inner-glow" x="1" y="179" width="698" height="78" rx="7" fill="url(#glow-fulfillment)" />
        <text className="lane-label" x="14" y="222">FULFILLMENT</text>

        <g className="node-group node-type-action" transform="translate(200, 218)">
          <rect className="node-rect" x="-40" y="-15" width="80" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Confirm</text>
        </g>

        <g className="node-group node-type-action" transform="translate(437, 218)">
          <rect className="node-rect" x="-45" y="-15" width="90" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Ship Standard</text>
        </g>

        <g className="node-group node-type-action" transform="translate(562, 218)">
          <rect className="node-rect" x="-42" y="-15" width="84" height="30"
                style={{ stroke: 'rgba(255,146,67,0.3)' }} />
          <text className="node-type-badge" x="0" y="-6" fill="#FF9243">ACTION</text>
          <text className="node-label" x="0" y="6">Ship Express</text>
        </g>

        <g className="node-group node-type-terminal" transform="translate(658, 218)">
          <circle className="node-circle" cx="0" cy="0" r="13" />
          <text className="node-label" x="0" y="0" fontSize="8.5">End</text>
        </g>
      </g>

      {/* Cross-lane edges */}
      <line className="edge" x1="149" y1="39" x2="242" y2="39" markerEnd="url(#arrow)" />
      <path className="edge" d="M282 54 L282 94" markerEnd="url(#arrow)" />
      <path className="edge" d="M322 109 L400 127" markerEnd="url(#arrow)" />
      <path className="edge" d="M152 146 L152 170 L200 203" markerEnd="url(#arrow)" />
      <line className="edge" x1="240" y1="218" x2="392" y2="218" markerEnd="url(#arrow)" />
      <path className="edge" d="M482 218 L510 218 L510 244 L658 244 L658 231" markerEnd="url(#arrow)" />
      <line className="edge" x1="604" y1="218" x2="645" y2="218" markerEnd="url(#arrow)" />
    </svg>
  )
}
