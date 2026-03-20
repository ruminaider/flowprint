import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
  TriggerNode,
} from '@ruminaider/flowprint-schema'
import type { RulesDocument } from '../rules/types.js'

/**
 * The seven schema-defined node types, plus 'unknown' for unrecognized nodes.
 *
 * Future improvement: a discriminated union keyed on `type` would let each
 * node type define its own set of valid statuses (e.g., only 'switch' steps
 * can have status 'matched'). That requires a larger refactor of BaseStep
 * into per-type interfaces — tracked as a potential follow-up.
 */
export type StepNodeType =
  | 'action'
  | 'switch'
  | 'parallel'
  | 'wait'
  | 'error'
  | 'terminal'
  | 'trigger'
  | 'unknown'
  | 'compensation'

/**
 * All step status values used across the runner and simulator.
 */
export type StepStatus =
  | 'completed'
  | 'matched'
  | 'default'
  | 'no-match'
  | 'fixture'
  | 'timeout'
  | 'skipped'
  | 'handled'
  | 'reached'
  | 'activated'
  | 'fired'
  | 'error'

/** Common fields shared by all step types (runner StepResult, simulator SimulationStep). */
export interface BaseStep {
  node_id: string
  type: StepNodeType
  status: StepStatus
  matched_case?: number
  next?: string
  outcome?: string
  error?: string
}

/** Common fields shared by all trace types. */
export interface BaseTrace<TStep extends BaseStep> {
  status: 'success' | 'failure' | 'error'
  steps: TStep[]
  output?: unknown
  error?: string
}

/**
 * Handlers for each node type. Each handler:
 * - Receives the node and a mutable walk context
 * - Performs its work (file I/O, rules evaluation, etc.)
 * - Returns a step result
 * - The walk skeleton extracts `next` from the step to determine the next node
 *
 * Handlers may return a value or a Promise (async is auto-awaited).
 */
export interface WalkHandlers<TStep extends BaseStep> {
  onAction(nodeId: string, node: ActionNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onSwitch(nodeId: string, node: SwitchNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onParallel(
    nodeId: string,
    node: ParallelNode,
    ctx: WalkContext<TStep>,
    walkBranch: (startNodeId: string) => Promise<TStep[]>,
  ): TStep | Promise<TStep>
  onWait(nodeId: string, node: WaitNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onError(nodeId: string, node: ErrorNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onTerminal(nodeId: string, node: TerminalNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onTrigger(nodeId: string, node: TriggerNode, ctx: WalkContext<TStep>): TStep | Promise<TStep>
  onUnknownNodeType?(nodeId: string): TStep
}

/** Mutable context passed to handlers during the walk. */
export interface WalkContext<TStep extends BaseStep> {
  doc: FlowprintDocument
  input: unknown
  results: Map<string, unknown>
  steps: TStep[]
  rulesData?: Record<string, RulesDocument>
}

/** Options for the walk skeleton. */
export interface WalkOptions {
  maxSteps?: number
  startNodeId?: string
  signal?: AbortSignal
}
