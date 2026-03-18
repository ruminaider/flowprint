import type { FlowprintDocument, WaitNode, Node } from '@ruminaider/flowprint-schema'
import {
  findRoots,
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isErrorNode,
  isTerminalNode,
  isTriggerNode,
} from '@ruminaider/flowprint-schema'
import type {
  ExecutionContext,
  WalkerCallbacks,
  WalkOptions,
  WalkResult,
  NodeExecutionRecord,
} from './types.js'

/**
 * Compensation entry pushed after a successful action with a `compensation` field.
 * The handler is provided by the consumer and called during LIFO unwind.
 */
export interface CompensationEntry {
  nodeId: string
  handler: () => Promise<void>
}

/**
 * Result of running compensation handlers. Tracks which succeeded and which failed.
 */
export interface CompensationResult {
  compensated: string[]
  compensationErrors: { nodeId: string; error: Error }[]
}

/**
 * Extended callbacks for walkGraph beyond the base WalkerCallbacks.
 * These hooks give the consumer control over compensation and wait routing.
 */
export interface WalkGraphCallbacks<TStep = NodeExecutionRecord> extends WalkerCallbacks<TStep> {
  /**
   * Called when an action node with a `compensation` field completes successfully.
   * Should return a handler function that performs the compensation.
   */
  onCompensation?(
    nodeId: string,
    compensation: { file: string; symbol: string },
    result: unknown,
  ): () => Promise<void>

  /**
   * Called during compensation unwind for each handler (success or failure).
   * Used for trace recording of compensation steps.
   */
  onCompensationStep?(nodeId: string, error?: Error): void

  /**
   * Determines the next node for a wait node.
   * Can return node.timeout_next for timeout scenarios.
   * Defaults to node.next if not provided.
   */
  resolveWaitNext?(nodeId: string, node: WaitNode, result: unknown): string | undefined
}

/**
 * Generic, callback-driven graph walker.
 *
 * Owns traversal logic (chain-following via `next` pointers), context management
 * (flat-merge after each node), compensation stack (LIFO), and AbortSignal checking.
 * Delegates node-type-specific behavior to `callbacks`.
 *
 * The `callbacks.onStep` function is the step recorder. Each callback implementation
 * (onAction, onSwitch, etc.) should call `onStep(record)` to record its step.
 * walkGraph intercepts these calls and collects them into `WalkResult.trace`.
 *
 * Key behaviors centralized here:
 * 1. Root node finding via findRoots()
 * 2. Chain-following loop (follow `next` pointers, NOT topological)
 * 3. Context management (fresh ExecutionContext, flat-merge after each node)
 * 4. AbortSignal checking before each node
 * 5. Compensation stack management (LIFO, best-effort, scoped per parallel branch)
 * 6. Action error -> error node routing
 * 7. Terminal handling (outcome capture)
 */
export async function walkGraph<TStep = NodeExecutionRecord>(
  doc: FlowprintDocument,
  input: Record<string, unknown>,
  callbacks: WalkGraphCallbacks<TStep>,
  options?: WalkOptions,
): Promise<WalkResult<TStep>> {
  const signal = options?.abortController?.signal ?? new AbortController().signal
  const trace: TStep[] = []
  const compensationStack: CompensationEntry[] = []
  const state: Record<string, unknown> = {}

  // Wrap onStep to capture records into the trace array
  const userOnStep = callbacks.onStep.bind(callbacks)
  callbacks.onStep = (record: TStep): void => {
    trace.push(record)
    userOnStep(record)
  }

  // Find root nodes (nodes with no incoming edges)
  const roots = findRoots(doc)
  if (roots.length === 0) {
    throw new Error('No root nodes found in the document')
  }

  let currentNodeId: string | undefined = roots[0]
  let outcome: 'success' | 'failure' | undefined
  let lastCompensationResult: CompensationResult | undefined

  const makeCtx = (nodeId: string, nodeType: string, lane: string): ExecutionContext => ({
    input,
    state,
    node: { id: nodeId, type: nodeType, lane },
    signal,
  })

  try {
    while (currentNodeId) {
      // Check abort before each node
      if (signal.aborted) {
        break
      }

      const node = doc.nodes[currentNodeId]
      if (!node) {
        throw new Error(`Node "${currentNodeId}" not found in document`)
      }

      const ctx = makeCtx(currentNodeId, node.type, node.lane)

      if (isTriggerNode(node)) {
        const nextFromCallback = await callbacks.onTrigger(currentNodeId, node, ctx)
        currentNodeId = nextFromCallback ?? (node.next as string | undefined)
      } else if (isActionNode(node)) {
        try {
          const result = await callbacks.onAction(currentNodeId, node, ctx)
          mergeOutput(state, result)

          // Track compensation if available
          if (node.compensation && callbacks.onCompensation) {
            compensationStack.push({
              nodeId: currentNodeId,
              handler: callbacks.onCompensation(currentNodeId, node.compensation, result),
            })
          }

          currentNodeId = node.next
        } catch (err: unknown) {
          // Route to error handler if defined on the action node
          if (node.error?.catch) {
            const errorNodeId = node.error.catch
            const errorNode = doc.nodes[errorNodeId]
            if (errorNode && isErrorNode(errorNode)) {
              currentNodeId = errorNodeId
              continue
            }
          }
          // No error handler — re-throw to outer catch
          throw err
        }
      } else if (isSwitchNode(node)) {
        const nextNodeId = await callbacks.onSwitch(currentNodeId, node, ctx)
        currentNodeId = nextNodeId
      } else if (isParallelNode(node)) {
        const result = await callbacks.onParallel(currentNodeId, node, ctx)
        mergeOutput(state, result)
        currentNodeId = node.join
      } else if (isWaitNode(node)) {
        const result = await callbacks.onWait(currentNodeId, node, ctx)
        mergeOutput(state, result)

        if (callbacks.resolveWaitNext) {
          currentNodeId = callbacks.resolveWaitNext(currentNodeId, node, result)
        } else {
          currentNodeId = node.next
        }
      } else if (isErrorNode(node)) {
        const nextFromCallback = await callbacks.onError(currentNodeId, node, ctx)
        currentNodeId = nextFromCallback ?? node.next
      } else if (isTerminalNode(node)) {
        outcome = node.outcome as 'success' | 'failure' | undefined
        if (callbacks.onTerminal) {
          await callbacks.onTerminal(currentNodeId, node, ctx)
        }
        currentNodeId = undefined
      } else {
        throw new Error(`Unknown node type for node "${currentNodeId}"`)
      }
    }
  } catch (err: unknown) {
    // Execute compensation stack in LIFO order (best-effort)
    lastCompensationResult = await runCompensationStack(compensationStack, callbacks)

    // Attach compensation result to the error for CompiledFlow to surface
    if (err instanceof Error) {
      ;(err as Error & { __compensationResult?: CompensationResult }).__compensationResult =
        lastCompensationResult
    }

    throw err
  }

  return {
    output: { ...state },
    trace,
    outcome,
  }
}

/**
 * Result of walkBranch: the branch state plus its compensation sub-stack.
 */
export interface BranchResult {
  state: Record<string, unknown>
  compensationStack: CompensationEntry[]
}

/**
 * Walk a subgraph starting at `startNodeId`, stopping when `stopNodeId` is reached.
 *
 * Used for parallel branch execution: each branch gets an isolated state copy
 * and walks its own subgraph until it reaches the join node (or a terminal).
 *
 * Each branch accumulates its own compensation sub-stack. On successful completion
 * the sub-stack is returned to the caller (onParallel) so it can be merged into
 * the parent compensation stack or unwound on failure.
 *
 * Rejects nested parallel nodes at runtime — parallel branches must not
 * contain other parallel nodes.
 */
export async function walkBranch<TStep = NodeExecutionRecord>(
  doc: FlowprintDocument,
  startNodeId: string,
  stopNodeId: string,
  ctx: ExecutionContext,
  callbacks: WalkGraphCallbacks<TStep>,
): Promise<BranchResult> {
  let currentNodeId: string | undefined = startNodeId
  const branchCompensationStack: CompensationEntry[] = []

  while (currentNodeId) {
    // Stop when we reach the join node
    if (currentNodeId === stopNodeId) {
      break
    }

    if (ctx.signal.aborted) {
      break
    }

    const node: Node | undefined = doc.nodes[currentNodeId]
    if (!node) {
      throw new Error(`Node "${currentNodeId}" not found in document`)
    }

    const nodeCtx: ExecutionContext = {
      input: ctx.input,
      state: ctx.state,
      node: { id: currentNodeId, type: node.type, lane: node.lane },
      signal: ctx.signal,
    }

    if (isParallelNode(node)) {
      throw new Error(
        `Nested parallel node "${currentNodeId}" found inside a parallel branch. ` +
          'Nested parallels are not supported.',
      )
    }

    if (isTriggerNode(node)) {
      const nextFromCallback = await callbacks.onTrigger(currentNodeId, node, nodeCtx)
      currentNodeId = nextFromCallback ?? (node.next as string | undefined)
    } else if (isActionNode(node)) {
      try {
        const result = await callbacks.onAction(currentNodeId, node, nodeCtx)
        mergeOutput(ctx.state, result)

        // Track compensation in this branch's sub-stack
        if (node.compensation && callbacks.onCompensation) {
          branchCompensationStack.push({
            nodeId: currentNodeId,
            handler: callbacks.onCompensation(currentNodeId, node.compensation, result),
          })
        }

        currentNodeId = node.next
      } catch (err: unknown) {
        if (node.error?.catch) {
          const catchNodeId: string = node.error.catch
          const errorNode = doc.nodes[catchNodeId]
          if (errorNode && isErrorNode(errorNode)) {
            currentNodeId = catchNodeId
            continue
          }
        }
        throw err
      }
    } else if (isSwitchNode(node)) {
      currentNodeId = await callbacks.onSwitch(currentNodeId, node, nodeCtx)
    } else if (isWaitNode(node)) {
      const result = await callbacks.onWait(currentNodeId, node, nodeCtx)
      mergeOutput(ctx.state, result)
      if (callbacks.resolveWaitNext) {
        currentNodeId = callbacks.resolveWaitNext(currentNodeId, node, result)
      } else {
        currentNodeId = node.next
      }
    } else if (isErrorNode(node)) {
      const nextFromCallback = await callbacks.onError(currentNodeId, node, nodeCtx)
      currentNodeId = nextFromCallback ?? node.next
    } else if (isTerminalNode(node)) {
      if (callbacks.onTerminal) {
        await callbacks.onTerminal(currentNodeId, node, nodeCtx)
      }
      currentNodeId = undefined
    } else {
      throw new Error(`Unknown node type for node "${currentNodeId}"`)
    }
  }

  return { state: ctx.state, compensationStack: branchCompensationStack }
}

/**
 * Flat-merge a node's output into the accumulated state.
 * Only merges plain objects; arrays and primitives are ignored.
 */
function mergeOutput(state: Record<string, unknown>, result: unknown): void {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    Object.assign(state, result)
  }
}

/**
 * Execute compensation handlers in LIFO order.
 * Best-effort: continues even if individual handlers fail.
 * Returns which compensations succeeded and which failed.
 */
export async function runCompensationStack<TStep>(
  stack: CompensationEntry[],
  callbacks: WalkGraphCallbacks<TStep>,
): Promise<CompensationResult> {
  const compensated: string[] = []
  const compensationErrors: { nodeId: string; error: Error }[] = []

  // Process in LIFO order
  const reversed = [...stack].reverse()
  // Clear the original stack
  stack.length = 0

  for (const entry of reversed) {
    try {
      await entry.handler()
      compensated.push(entry.nodeId)
      callbacks.onCompensationStep?.(entry.nodeId)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      compensationErrors.push({ nodeId: entry.nodeId, error })
      callbacks.onCompensationStep?.(entry.nodeId, error)
      // Continue — best-effort
    }
  }

  return { compensated, compensationErrors }
}
