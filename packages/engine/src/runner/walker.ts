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
import type { RunOptions, ExecutionContext, StepResult, ExecutionTrace } from './types.js'
import { interpretExpression } from '../expressions/interpreter.js'
import { loadEntryPoint } from './loader.js'
import { loadRulesFile, evaluateRules } from '../rules/evaluator.js'

interface CompensationEntry {
  nodeId: string
  entry: { file: string; symbol: string }
}

/**
 * Execute a flowprint document using an in-process graph walker.
 *
 * Walks the graph starting from root nodes, executing each node in sequence.
 * Action nodes call their entry_point functions, switch nodes evaluate
 * expressions to determine routing, parallel nodes execute branches
 * concurrently, and terminal nodes end execution.
 */
export async function runGraph(
  doc: FlowprintDocument,
  options: RunOptions,
): Promise<ExecutionTrace> {
  const startTime = performance.now()
  const steps: StepResult[] = []
  const context: ExecutionContext = {
    input: options.input,
    results: new Map(),
  }

  // Compensation stack for saga-style rollback (LIFO)
  const compensationStack: CompensationEntry[] = []

  const roots = findRoots(doc)
  if (roots.length === 0) {
    return {
      status: 'error',
      duration_ms: Math.round(performance.now() - startTime),
      steps,
      error: 'No root nodes found in the document',
    }
  }

  // Start walking from the first root node
  let currentNodeId: string | undefined = roots[0]

  try {
    while (currentNodeId) {
      const node = doc.nodes[currentNodeId]
      if (!node) {
        throw new Error(`Node "${currentNodeId}" not found in document`)
      }

      if (isActionNode(node)) {
        currentNodeId = await executeAction(
          currentNodeId,
          node,
          context,
          options,
          steps,
          compensationStack,
          doc,
        )
      } else if (isSwitchNode(node)) {
        currentNodeId = executeSwitch(currentNodeId, node, context, options, steps)
      } else if (isParallelNode(node)) {
        currentNodeId = await executeParallel(
          currentNodeId,
          node,
          context,
          options,
          steps,
          compensationStack,
          doc,
        )
      } else if (isWaitNode(node)) {
        currentNodeId = executeWait(currentNodeId, node, context, options, steps)
      } else if (isErrorNode(node)) {
        currentNodeId = await executeErrorHandler(currentNodeId, node, context, options, steps)
      } else if (isTriggerNode(node)) {
        currentNodeId = executeTrigger(currentNodeId, node, steps)
      } else if (isTerminalNode(node)) {
        executeTerminal(currentNodeId, node, steps)
        currentNodeId = undefined
      } else {
        throw new Error(`Unknown node type for node "${currentNodeId}"`)
      }
    }

    // Determine final status from the last terminal step
    const lastStep = steps[steps.length - 1]
    const outcome = lastStep?.outcome
    const status = outcome === 'failure' ? 'failure' : 'success'

    // Collect output from the last result in context
    const lastResultKey = [...context.results.keys()].pop()
    const output = lastResultKey !== undefined ? context.results.get(lastResultKey) : undefined

    return {
      status,
      duration_ms: Math.round(performance.now() - startTime),
      steps,
      output,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    // Execute compensation stack on error
    await runCompensation(compensationStack, context, options, steps)

    return {
      status: 'error',
      duration_ms: Math.round(performance.now() - startTime),
      steps,
      error: errorMessage,
    }
  }
}

async function executeAction(
  nodeId: string,
  node: ActionNode,
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
  compensationStack: CompensationEntry[],
  doc: FlowprintDocument,
): Promise<string | undefined> {
  const stepStart = performance.now()

  try {
    // Rules-driven action: evaluate rules file instead of entry points
    if (node.rules) {
      if (node.rules.evaluator && node.rules.evaluator !== 'builtin') {
        throw new Error(
          `Action node "${nodeId}" uses unknown evaluator "${node.rules.evaluator}". Only "builtin" is supported.`,
        )
      }

      const rulesDoc = loadRulesFile(node.rules.file, options.projectRoot)
      const rulesResult = evaluateRules(rulesDoc, context)
      context.results.set(nodeId, rulesResult.output)

      steps.push({
        node_id: nodeId,
        type: 'action',
        status: 'completed',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.next,
      })

      return node.next
    }

    const entryPoint = node.entry_points?.[0]
    if (!entryPoint) {
      throw new Error(`Action node "${nodeId}" has no entry_point or rules defined`)
    }

    const fn = await loadEntryPoint(entryPoint, options.projectRoot)

    // Evaluate input expressions if present
    let args: unknown
    if (node.inputs) {
      const evaluated: Record<string, unknown> = {}
      for (const [key, expr] of Object.entries(node.inputs)) {
        evaluated[key] = interpretExpression(expr, context)
      }
      args = evaluated
    } else {
      args = context.input
    }

    const result = await fn(args)
    context.results.set(nodeId, result)

    // Track compensation if available
    if (node.compensation) {
      compensationStack.push({
        nodeId,
        entry: node.compensation,
      })
    }

    steps.push({
      node_id: nodeId,
      type: 'action',
      status: 'completed',
      duration_ms: Math.round(performance.now() - stepStart),
      next: node.next,
    })

    return node.next
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)

    steps.push({
      node_id: nodeId,
      type: 'action',
      status: 'error',
      duration_ms: Math.round(performance.now() - stepStart),
      error: errorMessage,
    })

    // Route to error handler if defined
    if (node.error?.catch) {
      const errorNodeId = node.error.catch
      const errorNode = doc.nodes[errorNodeId]
      if (errorNode && isErrorNode(errorNode)) {
        // Store the error info so the error handler can access it
        context.results.set(nodeId, { error: errorMessage })
        return errorNodeId
      }
    }

    // No error handler — re-throw
    throw err
  }
}

function executeSwitch(
  nodeId: string,
  node: SwitchNode,
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
): string | undefined {
  const stepStart = performance.now()

  // Rules-driven switch: evaluate rules file for routing
  if (node.rules) {
    if (node.rules.evaluator && node.rules.evaluator !== 'builtin') {
      throw new Error(
        `Switch node "${nodeId}" uses unknown evaluator "${node.rules.evaluator}". Only "builtin" is supported.`,
      )
    }

    const rulesDoc = loadRulesFile(node.rules.file, options.projectRoot)
    const rulesResult = evaluateRules(rulesDoc, context)
    context.results.set(nodeId, rulesResult.output)

    // Route via `then.next` from matching rule
    const output = rulesResult.output as Record<string, unknown>
    const nextNode = output.next as string | undefined

    if (nextNode) {
      steps.push({
        node_id: nodeId,
        type: 'switch',
        status: 'matched',
        duration_ms: Math.round(performance.now() - stepStart),
        next: nextNode,
      })
      return nextNode
    }

    // No `next` in output — fall through to default
    if (node.default) {
      steps.push({
        node_id: nodeId,
        type: 'switch',
        status: 'default',
        duration_ms: Math.round(performance.now() - stepStart),
        next: node.default,
      })
      return node.default
    }

    steps.push({
      node_id: nodeId,
      type: 'switch',
      status: 'no-match',
      duration_ms: Math.round(performance.now() - stepStart),
    })
    return undefined
  }

  // Evaluate cases top-to-bottom, follow first match
  for (let i = 0; i < (node.cases?.length ?? 0); i++) {
    const c = node.cases?.[i]
    if (!c) continue

    const result = interpretExpression(c.when, context)

    if (result) {
      steps.push({
        node_id: nodeId,
        type: 'switch',
        status: 'matched',
        duration_ms: Math.round(performance.now() - stepStart),
        matched_case: i,
        next: c.next,
      })
      return c.next
    }
  }

  // Fall through to default
  if (node.default) {
    steps.push({
      node_id: nodeId,
      type: 'switch',
      status: 'default',
      duration_ms: Math.round(performance.now() - stepStart),
      next: node.default,
    })
    return node.default
  }

  // No match and no default
  steps.push({
    node_id: nodeId,
    type: 'switch',
    status: 'no-match',
    duration_ms: Math.round(performance.now() - stepStart),
  })
  return undefined
}

async function executeParallel(
  nodeId: string,
  node: ParallelNode,
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
  compensationStack: CompensationEntry[],
  doc: FlowprintDocument,
): Promise<string | undefined> {
  const stepStart = performance.now()

  const branchPromises = node.branches.map(async (branchId) => {
    const branchNode = doc.nodes[branchId]
    if (!branchNode) {
      throw new Error(`Parallel branch node "${branchId}" not found`)
    }

    if (isActionNode(branchNode)) {
      const entryPoint = branchNode.entry_points?.[0]
      if (!entryPoint) {
        throw new Error(`Action node "${branchId}" has no entry_point defined`)
      }

      const fn = await loadEntryPoint(entryPoint, options.projectRoot)

      let args: unknown
      if (branchNode.inputs) {
        const evaluated: Record<string, unknown> = {}
        for (const [key, expr] of Object.entries(branchNode.inputs)) {
          evaluated[key] = interpretExpression(expr, context)
        }
        args = evaluated
      } else {
        args = context.input
      }

      const result = await fn(args)
      context.results.set(branchId, result)

      if (branchNode.compensation) {
        compensationStack.push({
          nodeId: branchId,
          entry: branchNode.compensation,
        })
      }

      steps.push({
        node_id: branchId,
        type: 'action',
        status: 'completed',
      })

      return { branchId, result }
    }

    throw new Error(
      `Parallel branch "${branchId}" is not an action node (type: ${branchNode.type})`,
    )
  })

  const strategy = node.join_strategy ?? 'all'

  if (strategy === 'first') {
    const first = await Promise.race(branchPromises)
    context.results.set(nodeId, first.result)
  } else {
    // 'all' — wait for all branches
    const results = await Promise.all(branchPromises)
    const resultMap: Record<string, unknown> = {}
    for (const r of results) {
      resultMap[r.branchId] = r.result
    }
    context.results.set(nodeId, resultMap)
  }

  steps.push({
    node_id: nodeId,
    type: 'parallel',
    status: 'completed',
    duration_ms: Math.round(performance.now() - stepStart),
    next: node.join,
  })

  return node.join
}

function executeWait(
  nodeId: string,
  node: WaitNode,
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
): string | undefined {
  const stepStart = performance.now()

  const fixtureData = options.fixtures?.[nodeId]

  if (fixtureData !== undefined) {
    context.results.set(nodeId, fixtureData)
    steps.push({
      node_id: nodeId,
      type: 'wait',
      status: 'fixture',
      duration_ms: Math.round(performance.now() - stepStart),
      next: node.next,
    })
    return node.next
  }

  // No fixture — if timeout_next is defined, route there as a timeout
  if (node.timeout_next) {
    steps.push({
      node_id: nodeId,
      type: 'wait',
      status: 'timeout',
      duration_ms: Math.round(performance.now() - stepStart),
      next: node.timeout_next,
      error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Routing to timeout_next.`,
    })
    context.results.set(nodeId, undefined)
    return node.timeout_next
  }

  // No fixture, no timeout_next — skip with warning
  steps.push({
    node_id: nodeId,
    type: 'wait',
    status: 'skipped',
    duration_ms: Math.round(performance.now() - stepStart),
    next: node.next,
    error: `No fixture data for wait node "${nodeId}" (event: ${node.event}). Use --fixtures to provide signal data.`,
  })
  context.results.set(nodeId, undefined)
  return node.next
}

async function executeErrorHandler(
  nodeId: string,
  node: ErrorNode,
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
): Promise<string | undefined> {
  const stepStart = performance.now()

  if (node.entry_points?.[0]) {
    const fn = await loadEntryPoint(node.entry_points[0], options.projectRoot)
    const result = await fn(context.input)
    context.results.set(nodeId, result)
  }

  steps.push({
    node_id: nodeId,
    type: 'error',
    status: 'handled',
    duration_ms: Math.round(performance.now() - stepStart),
    next: node.next,
  })

  return node.next
}

function executeTrigger(
  nodeId: string,
  node: TriggerNode,
  steps: StepResult[],
): string | undefined {
  steps.push({
    node_id: nodeId,
    type: 'trigger',
    status: 'fired',
    next: node.next as string | undefined,
  })

  return node.next as string | undefined
}

function executeTerminal(nodeId: string, node: TerminalNode, steps: StepResult[]): void {
  steps.push({
    node_id: nodeId,
    type: 'terminal',
    status: 'reached',
    outcome: node.outcome,
  })
}

async function runCompensation(
  compensationStack: CompensationEntry[],
  context: ExecutionContext,
  options: RunOptions,
  steps: StepResult[],
): Promise<void> {
  // Execute compensation stack in LIFO order
  while (compensationStack.length > 0) {
    const comp = compensationStack.pop()
    if (!comp) break

    const stepStart = performance.now()
    try {
      const fn = await loadEntryPoint(comp.entry, options.projectRoot)
      const result = context.results.get(comp.nodeId)
      await fn(result)

      steps.push({
        node_id: `${comp.nodeId}:compensate`,
        type: 'compensation',
        status: 'completed',
        duration_ms: Math.round(performance.now() - stepStart),
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      steps.push({
        node_id: `${comp.nodeId}:compensate`,
        type: 'compensation',
        status: 'error',
        duration_ms: Math.round(performance.now() - stepStart),
        error: message,
      })
    }
  }
}
