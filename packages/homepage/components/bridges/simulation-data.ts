// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export interface BridgeSimulationProps {
  perspective: 'business' | 'developer'
}

export interface RippleObj {
  id: string
  cx: number
  cy: number
  color: string
  delay: number
}

export type SimMode = 'walkthrough' | 'stepbystep' | 'whatif'

/** @deprecated Kept for backward-compat; SVG components now use data attributes. */
export interface FlowSvgProps {
  getNodeClassName: (id: string) => string
  getEdgeClassName: (id: string) => string
}

// ══════════════════════════════════════════════════════
// NODE & EDGE DEFINITIONS
// ══════════════════════════════════════════════════════

// Walk-through: Patient Intake — urgent path
export const walkthroughPath = {
  nodes: ['wt-node-checkin', 'wt-node-verify', 'wt-node-assess', 'wt-node-priority', 'wt-node-emergprep', 'wt-node-review', 'wt-node-end'],
  edges: ['wt-edge-checkin-verify', 'wt-edge-verify-assess', 'wt-edge-assess-priority', 'wt-edge-priority-urgent-v', 'wt-edge-emergprep-review', 'wt-edge-review-end'],
  tooltips: [null, null, null, null, null, null, null] as (string | null)[],
  labels: ['Check In', 'Verify Insurance', 'Initial Assessment', 'Priority Rating', 'Emergency Prep', 'Doctor Review', 'End'],
}

// Step-by-step: Loan Application — approved path
export const stepByStepPath = {
  nodes: ['sb-node-submit', 'sb-node-upload', 'sb-node-credit', 'sb-node-risk', 'sb-node-offer', 'sb-node-disburse', 'sb-node-end'],
  edges: ['sb-edge-submit-upload', 'sb-edge-upload-credit', 'sb-edge-credit-risk', 'sb-edge-risk-approved-v', 'sb-edge-offer-disburse', 'sb-edge-disburse-end'],
  tooltips: ['tt-sb-submit', 'tt-sb-upload', 'tt-sb-credit', 'tt-sb-risk', 'tt-sb-offer', 'tt-sb-disburse', 'tt-sb-end'],
  labels: ['Submit Application', 'Upload Documents', 'Credit Check', 'Risk Assessment', 'Generate Offer', 'Disburse Funds', 'End'],
}

// What-if Scenario A: Insurance Claim — approve path (green, happy)
export const whatIfPathA = {
  nodes: ['wi-node-file', 'wi-node-evidence', 'wi-node-review', 'wi-node-assess', 'wi-node-payout', 'wi-node-issue', 'wi-node-end'],
  edges: ['wi-edge-file-evidence', 'wi-edge-evidence-review', 'wi-edge-review-assess', 'wi-edge-assess-approve-v', 'wi-edge-payout-issue', 'wi-edge-issue-end'],
  labels: ['File Claim', 'Submit Evidence', 'Review Claim', 'Assess Damage', 'Calculate Payout', 'Issue Payment', 'End'],
}

// What-if Scenario B: Insurance Claim — investigate path with Fraud Check ERROR
export const whatIfPathB = {
  nodes: ['wi-node-file', 'wi-node-evidence', 'wi-node-review', 'wi-node-assess', 'wi-node-fraud'],
  edges: ['wi-edge-file-evidence', 'wi-edge-evidence-review', 'wi-edge-review-assess', 'wi-edge-assess-investigate-v'],
  labels: ['File Claim', 'Submit Evidence', 'Review Claim', 'Assess Damage', 'Fraud Check'],
}

export const fileNames: Record<SimMode, string> = {
  walkthrough: 'patient-intake.flowprint',
  stepbystep: 'loan-application.flowprint',
  whatif: 'insurance-claim.flowprint',
}

// Node center positions (from data-cx, data-cy)
export const nodeCenters: Record<string, { x: number; y: number }> = {
  'wt-node-checkin': { x: 200, y: 63 },
  'wt-node-verify': { x: 430, y: 63 },
  'wt-node-assess': { x: 490, y: 187 },
  'wt-node-priority': { x: 660, y: 187 },
  'wt-node-emergprep': { x: 600, y: 325 },
  'wt-node-review': { x: 310, y: 325 },
  'wt-node-schedule': { x: 780, y: 375 },
  'wt-node-end': { x: 130, y: 325 },
  'sb-node-submit': { x: 200, y: 58 },
  'sb-node-upload': { x: 430, y: 58 },
  'sb-node-credit': { x: 430, y: 182 },
  'sb-node-risk': { x: 640, y: 182 },
  'sb-node-offer': { x: 640, y: 320 },
  'sb-node-disburse': { x: 560, y: 380 },
  'sb-node-reject': { x: 780, y: 320 },
  'sb-node-manual': { x: 340, y: 320 },
  'sb-node-end': { x: 160, y: 380 },
  'wi-node-file': { x: 200, y: 58 },
  'wi-node-evidence': { x: 430, y: 58 },
  'wi-node-review': { x: 430, y: 182 },
  'wi-node-assess': { x: 640, y: 182 },
  'wi-node-payout': { x: 630, y: 325 },
  'wi-node-issue': { x: 320, y: 325 },
  'wi-node-end': { x: 130, y: 325 },
  'wi-node-fraud': { x: 780, y: 325 },
}
