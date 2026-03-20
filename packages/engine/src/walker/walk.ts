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
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { BaseStep, WalkHandlers, WalkContext, WalkOptions } from './types.js'

const DEFAULT_MAX_STEPS = 500

/**
 * Generic graph walk skeleton.
 *
 * Traverses a flowprint document by dispatching each node to the appropriate
 * handler. Both the Node.js runner and browser simulator provide their own
 * handlers to implement environment-specific behavior (file I/O vs fixtures,
 * vm evaluation vs AST interpretation).
 *
 * @param doc - Flowprint document to walk
 * @param handlers - Node type handlers
 * @param input - Workflow input value
 * @param results - Shared results map (node outputs)
 * @param options - Walk options (maxSteps, startNodeId, signal)
 * @returns Array of steps produced during the walk
 */
export async function walkGraph<TStep extends BaseStep>(
  doc: FlowprintDocument,
  handlers: WalkHandlers<TStep>,
  input: unknown,
  results: Map<string, unknown>,
  options?: WalkOptions,
): Promise<TStep[]> {
  const maxSteps = options?.maxSteps ?? DEFAULT_MAX_STEPS
  const signal = options?.signal
  const steps: TStep[] = []
  const ctx: WalkContext<TStep> = { doc, input, results, steps }

  let currentNodeId: string | undefined

  if (options?.startNodeId) {
    currentNodeId = options.startNodeId
  } else {
    const roots = findRoots(doc)
    if (roots.length === 0) {
      throw new Error('No root nodes found in the document')
    }
    currentNodeId = roots[0]
  }

  let stepCount = 0

  while (currentNodeId) {
    if (signal?.aborted) {
      throw new Error('Walk aborted')
    }

    if (stepCount >= maxSteps) {
      throw new Error(`Walk exceeded maximum steps (${String(maxSteps)})`)
    }
    stepCount++

    const node = doc.nodes[currentNodeId]
    if (!node) {
      throw new Error(`Node "${currentNodeId}" not found in document`)
    }

    let step: TStep

    if (isActionNode(node)) {
      step = await handlers.onAction(currentNodeId, node, ctx)
    } else if (isSwitchNode(node)) {
      step = await handlers.onSwitch(currentNodeId, node, ctx)
    } else if (isParallelNode(node)) {
      const walkBranch = async (startId: string): Promise<TStep[]> => {
        // Each branch gets its own steps array and a snapshot of the results map
        // (so branches cannot observe each other's mutations)
        const branchResults = new Map(results)
        return walkGraph(doc, handlers, input, branchResults, {
          ...options,
          startNodeId: startId,
        })
      }
      step = await handlers.onParallel(currentNodeId, node, ctx, walkBranch)
    } else if (isWaitNode(node)) {
      step = await handlers.onWait(currentNodeId, node, ctx)
    } else if (isErrorNode(node)) {
      step = await handlers.onError(currentNodeId, node, ctx)
    } else if (isTriggerNode(node)) {
      step = await handlers.onTrigger(currentNodeId, node, ctx)
    } else if (isTerminalNode(node)) {
      step = await handlers.onTerminal(currentNodeId, node, ctx)
    } else if (handlers.onUnknownNodeType) {
      step = handlers.onUnknownNodeType(currentNodeId)
    } else {
      throw new Error(`Unknown node type for node "${currentNodeId}"`)
    }

    steps.push(step)
    currentNodeId = step.next
  }

  return steps
}
