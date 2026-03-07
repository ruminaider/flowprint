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

/** Common fields shared by all step types (runner StepResult, simulator SimulationStep). */
export interface BaseStep {
  node_id: string
  type: string
  status: string
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
