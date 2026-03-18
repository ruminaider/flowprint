import type {
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  ErrorNode,
  TerminalNode,
  TriggerNode,
} from '@ruminaider/flowprint-schema'

/**
 * Context passed to each node handler during graph execution.
 * Created fresh for each execute() call.
 */
export interface ExecutionContext {
  /** Original flow input. Treated as immutable during execution. */
  readonly input: Record<string, unknown>
  /** Accumulated state from prior nodes. Flat-merged after each node. */
  state: Record<string, unknown>
  /** Metadata about the currently executing node. */
  readonly node: {
    readonly id: string
    readonly type: string
    readonly lane: string
  }
  /** Cancellation/timeout signal. Handlers should check signal.aborted. */
  readonly signal: AbortSignal
}

/**
 * Delta-only trace record for a single node execution.
 * Stores what the node produced, not a full state snapshot.
 */
export interface NodeExecutionRecord {
  nodeId: string
  type: string
  lane: string
  startedAt: number
  completedAt: number
  /** What this node produced (delta). Full state reconstructable by replaying deltas. */
  output: Record<string, unknown>
  /** How this node was handled. */
  handler: 'expressions' | 'rules' | 'registered' | 'entry_point' | 'native'
  /** Present only if the node errored. */
  error?: { message: string; stack?: string }
}

/**
 * Pluggable callbacks for the generic graph walker.
 * TStep is generic so runner, simulator, and engine can each define their own step shape.
 */
export interface WalkerCallbacks<TStep = NodeExecutionRecord> {
  onAction(nodeId: string, node: ActionNode, ctx: ExecutionContext): Promise<unknown>
  onSwitch(nodeId: string, node: SwitchNode, ctx: ExecutionContext): Promise<string | undefined>
  onParallel(nodeId: string, node: ParallelNode, ctx: ExecutionContext): Promise<unknown>
  onWait(nodeId: string, node: WaitNode, ctx: ExecutionContext): Promise<unknown>
  onError(nodeId: string, node: ErrorNode, ctx: ExecutionContext): Promise<string | undefined>
  onTrigger(nodeId: string, node: TriggerNode, ctx: ExecutionContext): Promise<string | undefined>
  onTerminal?(nodeId: string, node: TerminalNode, ctx: ExecutionContext): Promise<void>
  /** Called after each node completes. Used for trace recording. */
  onStep(record: TStep): void
}

/**
 * Options for walkGraph.
 */
export interface WalkOptions {
  /** AbortController for the entire walk. */
  abortController?: AbortController
}

/**
 * Result of a complete graph walk.
 */
export interface WalkResult<TStep = NodeExecutionRecord> {
  /** Final accumulated state after all nodes. */
  output: Record<string, unknown>
  /** Ordered list of step records. */
  trace: TStep[]
  /** Terminal node outcome if reached. */
  outcome?: 'success' | 'failure'
}
