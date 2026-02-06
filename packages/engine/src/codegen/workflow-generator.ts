import type { FlowprintDocument, ActionNode, WaitNode } from '@ruminaider/flowprint-schema'
import {
  topoSort,
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isTerminalNode,
  isErrorNode,
} from '@ruminaider/flowprint-schema'
import type { GeneratedFile } from './types.js'
import { FILE_HEADER, indent, camelCase } from './utils.js'

export function generateWorkflow(doc: FlowprintDocument): GeneratedFile {
  const lines: string[] = []
  const flowName = camelCase(doc.name)

  // Collect info for imports
  const waitNodes = collectWaitNodes(doc)
  const hasCompensation = hasCompensationNodes(doc)
  const hasParallelFirst = hasParallelFirstNodes(doc)
  const hasWait = waitNodes.length > 0
  const hasTimeout = waitNodes.some((w) => w.node.timeout)

  // Temporal workflow imports
  const workflowImports = ['proxyActivities']
  if (hasWait) {
    workflowImports.push('defineSignal', 'setHandler', 'condition')
  }
  if (hasTimeout) {
    workflowImports.push('sleep')
  }
  if (hasParallelFirst) {
    workflowImports.push('CancellationScope')
  }

  // Always import upsertSearchAttributes for node tracking
  workflowImports.push('upsertSearchAttributes')

  lines.push(`import { ${workflowImports.join(', ')} } from '@temporalio/workflow'`)
  lines.push(`import type * as activities from './activities'`)

  // Type imports for input_type
  if (doc.workflow?.input_type) {
    const importPath = doc.workflow.input_type_import ?? './types'
    lines.push(`import type { ${doc.workflow.input_type} } from '${importPath}'`)
  }

  // Type imports for wait node event types
  for (const { node } of waitNodes) {
    if (node.event_type) {
      const importPath = node.event_type_import ?? './types'
      lines.push(`import type { ${node.event_type} } from '${importPath}'`)
    }
  }

  lines.push('')

  // Activity proxies
  lines.push(...generateActivityProxies(doc))
  lines.push('')

  // Signal definitions
  for (const { id, node } of waitNodes) {
    const signalName = node.event
    if (node.event_type) {
      lines.push(
        `const ${camelCase(id)}Signal = defineSignal<[${node.event_type}]>('${signalName}')`,
      )
    } else {
      lines.push(`const ${camelCase(id)}Signal = defineSignal('${signalName}')`)
    }
  }

  if (waitNodes.length > 0) {
    lines.push('')
  }

  // Main workflow function
  const inputType = doc.workflow?.input_type ?? 'unknown'
  lines.push(`export async function ${flowName}(input: ${inputType}): Promise<unknown> {`)

  // Compensation stack
  if (hasCompensation) {
    lines.push(`  const compensationStack: Array<() => Promise<void>> = []`)
    lines.push('')
  }

  // Generate try/catch wrapper if compensation exists
  if (hasCompensation) {
    lines.push('  try {')
    lines.push(generateWorkflowBody(doc, 2))
    lines.push('  } catch (err) {')
    lines.push('    for (const compensate of compensationStack.reverse()) {')
    lines.push('      await compensate()')
    lines.push('    }')
    lines.push('    throw err')
    lines.push('  }')
  } else {
    lines.push(generateWorkflowBody(doc, 1))
  }

  lines.push('}')

  const content = FILE_HEADER + lines.join('\n') + '\n'
  return { path: 'workflow.ts', content }
}

interface WaitNodeInfo {
  id: string
  node: WaitNode
}

function collectWaitNodes(doc: FlowprintDocument): WaitNodeInfo[] {
  const result: WaitNodeInfo[] = []
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (isWaitNode(node)) {
      result.push({ id, node })
    }
  }
  return result
}

function hasCompensationNodes(doc: FlowprintDocument): boolean {
  for (const node of Object.values(doc.nodes)) {
    if (isActionNode(node) && node.compensation) {
      return true
    }
  }
  return false
}

function hasParallelFirstNodes(doc: FlowprintDocument): boolean {
  for (const node of Object.values(doc.nodes)) {
    if (isParallelNode(node) && node.join_strategy === 'first') {
      return true
    }
  }
  return false
}

function generateActivityProxies(doc: FlowprintDocument): string[] {
  const lines: string[] = []
  const nodesWithTemporal: { id: string; node: ActionNode }[] = []
  let hasNodesWithoutTemporal = false

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (isActionNode(node)) {
      if (node.temporal) {
        nodesWithTemporal.push({ id, node })
      } else if (node.entry_points && node.entry_points.length > 0) {
        hasNodesWithoutTemporal = true
      }
    }
  }

  // Default proxy for nodes without temporal config
  if (hasNodesWithoutTemporal) {
    lines.push(`const defaultActivities = proxyActivities<typeof activities>({`)
    lines.push(`  startToCloseTimeout: '1m',`)
    lines.push(`})`)
    lines.push('')
  }

  // Per-node proxies for nodes with temporal config
  for (const { id, node } of nodesWithTemporal) {
    const varName = camelCase(id) + 'Activities'
    lines.push(`const ${varName} = proxyActivities<typeof activities>({`)

    const temporal = node.temporal
    if (temporal?.start_to_close_timeout) {
      lines.push(`  startToCloseTimeout: '${temporal.start_to_close_timeout}',`)
    }
    if (temporal?.schedule_to_close_timeout) {
      lines.push(`  scheduleToCloseTimeout: '${temporal.schedule_to_close_timeout}',`)
    }
    if (temporal?.heartbeat_timeout) {
      lines.push(`  heartbeatTimeout: '${temporal.heartbeat_timeout}',`)
    }
    if (temporal?.retry) {
      lines.push(`  retry: {`)
      if (temporal.retry.max_attempts !== undefined) {
        lines.push(`    maximumAttempts: ${String(temporal.retry.max_attempts)},`)
      }
      if (temporal.retry.backoff_coefficient !== undefined) {
        lines.push(`    backoffCoefficient: ${String(temporal.retry.backoff_coefficient)},`)
      }
      if (temporal.retry.initial_interval) {
        lines.push(`    initialInterval: '${temporal.retry.initial_interval}',`)
      }
      if (temporal.retry.max_interval) {
        lines.push(`    maximumInterval: '${temporal.retry.max_interval}',`)
      }
      if (temporal.retry.non_retryable_errors && temporal.retry.non_retryable_errors.length > 0) {
        const errors = temporal.retry.non_retryable_errors.map((e) => `'${e}'`).join(', ')
        lines.push(`    nonRetryableErrorTypes: [${errors}],`)
      }
      lines.push(`  },`)
    }

    lines.push(`})`)
    lines.push('')
  }

  return lines
}

function getActivityProxy(nodeId: string, node: ActionNode): string {
  if (node.temporal) {
    return camelCase(nodeId) + 'Activities'
  }
  return 'defaultActivities'
}

function generateWorkflowBody(doc: FlowprintDocument, indentLevel: number): string {
  const sorted = topoSort(doc)
  const lines: string[] = []

  // Track which nodes are branches of parallel nodes (skip standalone generation)
  const parallelBranchNodes = new Set<string>()
  for (const { node } of sorted) {
    if (isParallelNode(node)) {
      for (const branch of node.branches) {
        parallelBranchNodes.add(branch)
      }
    }
  }

  for (const { id, node } of sorted) {
    // Skip nodes that are parallel branches (handled within parallel generation)
    if (parallelBranchNodes.has(id)) continue

    const nodeLines = generateNodeCode(id, node, doc)
    if (nodeLines.length > 0) {
      lines.push(...nodeLines)
      lines.push('')
    }
  }

  return indent(lines.join('\n'), indentLevel)
}

function generateNodeCode(
  id: string,
  node: import('@ruminaider/flowprint-schema').Node,
  doc: FlowprintDocument,
): string[] {
  const lines: string[] = []
  const varName = camelCase(id)

  // Search attributes: track current node
  lines.push(`upsertSearchAttributes({ flowprint_current_node: ['${id}'] })`)

  if (isActionNode(node)) {
    lines.push(...generateActionCode(id, node))
  } else if (isSwitchNode(node)) {
    lines.push(...generateSwitchCode(id, node))
  } else if (isParallelNode(node)) {
    lines.push(...generateParallelCode(id, node, doc))
  } else if (isWaitNode(node)) {
    lines.push(...generateWaitCode(id, node))
  } else if (isTerminalNode(node)) {
    if (node.outcome === 'success') {
      lines.push(`return { outcome: 'success', node: '${id}' }`)
    } else {
      lines.push(`throw new Error('Terminal failure: ${node.label}')`)
    }
  } else if (isErrorNode(node)) {
    lines.push(`// Error handler: ${node.label}`)
    if (node.entry_points && node.entry_points.length > 0) {
      lines.push(`const ${varName} = await defaultActivities.${varName}()`)
    }
  }

  return lines
}

function generateActionCode(id: string, node: ActionNode): string[] {
  const lines: string[] = []
  const varName = camelCase(id)

  if (!node.entry_points || node.entry_points.length === 0) {
    lines.push(`// ${node.label} (no entry points)`)
    return lines
  }

  const proxy = getActivityProxy(id, node)
  const errorCatchNode = node.error?.catch

  if (errorCatchNode) {
    lines.push(`try {`)
  }

  const prefix = errorCatchNode ? '  ' : ''

  // Build activity call with inputs
  if (node.inputs && Object.keys(node.inputs).length > 0) {
    const args = Object.entries(node.inputs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    lines.push(`${prefix}const ${varName} = await ${proxy}.${varName}({ ${args} })`)
  } else {
    lines.push(`${prefix}const ${varName} = await ${proxy}.${varName}()`)
  }

  // Compensation
  if (node.compensation) {
    const compensateName = varName + 'Compensate'
    lines.push(
      `${prefix}compensationStack.push(async () => { await ${proxy}.${compensateName}() })`,
    )
  }

  if (errorCatchNode) {
    lines.push(`} catch (err) {`)
    lines.push(`  upsertSearchAttributes({ flowprint_current_node: ['${errorCatchNode}'] })`)
    lines.push(`  // -> ${errorCatchNode} (error path)`)
    lines.push(`}`)
  }

  return lines
}

function generateSwitchCode(
  id: string,
  node: import('@ruminaider/flowprint-schema').SwitchNode,
): string[] {
  const lines: string[] = []

  lines.push(`// Switch: ${node.label}`)

  for (let i = 0; i < node.cases.length; i++) {
    const c = node.cases[i]
    if (!c) continue
    const prefix = i === 0 ? 'if' : '} else if'
    lines.push(`${prefix} (${c.when}) {`)
    lines.push(`  upsertSearchAttributes({ flowprint_switch_decisions: ['${id}:${c.next}'] })`)
    lines.push(`  // -> ${c.next}`)
  }

  if (node.default) {
    lines.push(`} else {`)
    lines.push(
      `  upsertSearchAttributes({ flowprint_switch_decisions: ['${id}:${node.default}'] })`,
    )
    lines.push(`  // -> ${node.default}`)
  }

  lines.push(`}`)

  return lines
}

function generateParallelCode(
  _id: string,
  node: import('@ruminaider/flowprint-schema').ParallelNode,
  doc: FlowprintDocument,
): string[] {
  const lines: string[] = []

  lines.push(`// Parallel: ${node.label}`)

  const branchVars = node.branches.map((b) => camelCase(b))

  if (node.join_strategy === 'first') {
    lines.push(`await CancellationScope.cancellable(async () => {`)
    lines.push(`  await Promise.race([`)
    for (const branch of node.branches) {
      const branchNode = doc.nodes[branch]
      if (branchNode && isActionNode(branchNode)) {
        const proxy = getActivityProxy(branch, branchNode)
        lines.push(`    ${proxy}.${camelCase(branch)}(),`)
      }
    }
    lines.push(`  ])`)
    lines.push(`})`)
  } else {
    // Default: all / all_reached / await_all
    const assignments = branchVars.map((v) => v).join(', ')
    lines.push(`const [${assignments}] = await Promise.all([`)
    for (const branch of node.branches) {
      const branchNode = doc.nodes[branch]
      if (branchNode && isActionNode(branchNode)) {
        const proxy = getActivityProxy(branch, branchNode)
        lines.push(`  ${proxy}.${camelCase(branch)}(),`)
      }
    }
    lines.push(`])`)
  }

  return lines
}

function generateWaitCode(id: string, node: WaitNode): string[] {
  const lines: string[] = []
  const varName = camelCase(id)
  const signalVar = varName + 'Signal'
  const dataVar = varName + 'Data'

  lines.push(`// Wait: ${node.label}`)

  if (node.event_type) {
    lines.push(`let ${dataVar}: ${node.event_type} | undefined`)
  } else {
    lines.push(`let ${dataVar}: unknown`)
  }

  lines.push(`setHandler(${signalVar}, (data) => {`)
  lines.push(`  ${dataVar} = data`)
  lines.push(`})`)

  if (node.timeout && node.timeout_next) {
    lines.push(
      `const ${varName}Met = await condition(() => ${dataVar} !== undefined, '${node.timeout}')`,
    )
    lines.push(`if (!${varName}Met) {`)
    lines.push(`  upsertSearchAttributes({ flowprint_current_node: ['${node.timeout_next}'] })`)
    lines.push(`  // -> ${node.timeout_next} (timeout path)`)
    lines.push(`}`)
  } else if (node.timeout) {
    lines.push(`await condition(() => ${dataVar} !== undefined, '${node.timeout}')`)
  } else {
    lines.push(`await condition(() => ${dataVar} !== undefined)`)
  }

  return lines
}
