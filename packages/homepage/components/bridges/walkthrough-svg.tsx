import type { RippleObj } from './simulation-data'
import { FlowSvgShell } from './flow-svg-shell'

export interface WalkthroughSvgProps {
  isActive: boolean
  wtRipples: RippleObj[]
}

export function WalkthroughSvg({ isActive, wtRipples }: WalkthroughSvgProps) {
  return (
    <FlowSvgShell
      isActive={isActive}
      ripples={wtRipples}
      lanes={[
        { y: 4, height: 118, label: 'RECEPTION', labelY: 68 },
        { y: 128, height: 118, label: 'TRIAGE', labelY: 192 },
        { y: 252, height: 144, label: 'CLINICAL', labelY: 328 },
      ]}
      markers={[
        { id: 'wt-arrow', fill: '#6b4d40' },
        { id: 'wt-arrow-green', fill: '#3FDC77' },
      ]}
    >
      {/* ALL edges */}
      <line
        data-edge-id="wt-edge-checkin-verify"
        className="edge"
        x1="238"
        y1="63"
        x2="390"
        y2="63"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-verify-assess"
        className="edge"
        x1="430"
        y1="78"
        x2="490"
        y2="172"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-assess-priority"
        className="edge"
        x1="536"
        y1="187"
        x2="620"
        y2="187"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-priority-urgent-v"
        className="edge"
        x1="660"
        y1="202"
        x2="640"
        y2="310"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-priority-routine-h"
        className="edge"
        x1="700"
        y1="187"
        x2="780"
        y2="187"
      />
      <line
        data-edge-id="wt-edge-priority-routine-v"
        className="edge"
        x1="780"
        y1="187"
        x2="780"
        y2="360"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-emergprep-review"
        className="edge"
        x1="560"
        y1="325"
        x2="350"
        y2="325"
        markerEnd="url(#wt-arrow)"
      />
      <line
        data-edge-id="wt-edge-review-end"
        className="edge"
        x1="270"
        y1="325"
        x2="143"
        y2="325"
        markerEnd="url(#wt-arrow)"
      />
      <path
        data-edge-id="wt-edge-sched-end-h"
        className="edge"
        d="M737 375 L130 375 L130 338"
        markerEnd="url(#wt-arrow)"
      />

      {/* Edge labels */}
      <text className="edge-label" x="665" y="255">
        urgent
      </text>
      <text className="edge-label" x="720" y="180">
        routine
      </text>

      {/* ALL nodes */}
      {/* Check In (action) */}
      <g
        data-node-id="wt-node-checkin"
        className="node-group ntype-action"
        data-cx="200"
        data-cy="63"
        transform="translate(200,63)"
      >
        <rect
          className="node-rect"
          x="-38"
          y="-15"
          width="76"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Check In
        </text>
      </g>
      {/* Verify Insurance (action) */}
      <g
        data-node-id="wt-node-verify"
        className="node-group ntype-action"
        data-cx="430"
        data-cy="63"
        transform="translate(430,63)"
      >
        <rect
          className="node-rect"
          x="-40"
          y="-15"
          width="80"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Verify Insurance
        </text>
      </g>
      {/* Initial Assessment (action) */}
      <g
        data-node-id="wt-node-assess"
        className="node-group ntype-action"
        data-cx="490"
        data-cy="187"
        transform="translate(490,187)"
      >
        <rect
          className="node-rect"
          x="-46"
          y="-15"
          width="92"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Initial Assessment
        </text>
      </g>
      {/* Priority Rating (switch) */}
      <g
        data-node-id="wt-node-priority"
        className="node-group ntype-switch"
        data-cx="660"
        data-cy="187"
        transform="translate(660,187)"
      >
        <rect
          className="node-rect"
          x="-40"
          y="-15"
          width="80"
          height="30"
          style={{ stroke: 'rgba(163,116,255,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#A374FF">
          SWITCH
        </text>
        <text className="node-label" x="0" y="6">
          Priority
        </text>
      </g>
      {/* Emergency Prep (action) */}
      <g
        data-node-id="wt-node-emergprep"
        className="node-group ntype-action"
        data-cx="600"
        data-cy="325"
        transform="translate(600,325)"
      >
        <rect
          className="node-rect"
          x="-40"
          y="-15"
          width="80"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Emergency Prep
        </text>
      </g>
      {/* Doctor Review (action) */}
      <g
        data-node-id="wt-node-review"
        className="node-group ntype-action"
        data-cx="310"
        data-cy="325"
        transform="translate(310,325)"
      >
        <rect
          className="node-rect"
          x="-40"
          y="-15"
          width="80"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Doctor Review
        </text>
      </g>
      {/* Schedule Appointment (action) */}
      <g
        data-node-id="wt-node-schedule"
        className="node-group ntype-action"
        data-cx="780"
        data-cy="375"
        transform="translate(780,375)"
      >
        <rect
          className="node-rect"
          x="-43"
          y="-15"
          width="86"
          height="30"
          style={{ stroke: 'rgba(255,146,67,0.3)' }}
        />
        <text className="node-type-badge" x="0" y="-6" fill="#FF9243">
          ACTION
        </text>
        <text className="node-label" x="0" y="6">
          Schedule Appt
        </text>
      </g>
      {/* End (terminal) */}
      <g
        data-node-id="wt-node-end"
        className="node-group ntype-terminal"
        data-cx="130"
        data-cy="325"
        transform="translate(130,325)"
      >
        <circle className="node-circle" cx="0" cy="0" r="13" />
        <text className="node-label" x="0" y="0" fontSize="8.5">
          End
        </text>
      </g>
    </FlowSvgShell>
  )
}
