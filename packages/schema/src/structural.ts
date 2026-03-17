import type { ValidationError } from './types.js'

/**
 * Perform structural validation on a schema-valid Flowprint document.
 * Checks for:
 * 1. Dangling node references (next, cases[].next, branches[], join, error.catch, default, timeout_next)
 * 2. Invalid lane references (node.lane must exist in lanes)
 * 3. Orphan nodes (non-terminals: no incoming AND no outgoing; terminals: no incoming)
 *
 * This function assumes the document has already passed schema validation.
 */
export function validateStructure(doc: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []

  const lanes = doc.lanes as Record<string, unknown> | undefined
  const nodes = doc.nodes as Record<string, unknown> | undefined

  if (!lanes || !nodes) {
    return errors
  }

  const laneIds = new Set(Object.keys(lanes))
  const nodeIds = new Set(Object.keys(nodes))

  // Track incoming and outgoing edges for orphan detection
  const hasIncoming = new Set<string>()
  const hasOutgoing = new Set<string>()

  for (const [nodeId, nodeDef] of Object.entries(nodes)) {
    const node = nodeDef as Record<string, unknown>

    // Check lane reference
    const lane = node.lane as string | undefined
    if (lane && !laneIds.has(lane)) {
      errors.push({
        path: `/nodes/${nodeId}/lane`,
        message: `Lane "${lane}" does not exist. Available lanes: ${[...laneIds].join(', ')}`,
        severity: 'error',
      })
    }

    const type = node.type as string

    // Mutual exclusion: expressions vs rules vs entry_points on action nodes
    if (type === 'action') {
      const hasRules = node.rules !== undefined
      const hasEntryPoints = node.entry_points !== undefined
      const hasExpressions = node.expressions !== undefined

      if (hasExpressions && hasRules) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message:
            'Action node cannot have both "expressions" and "rules". Use one or the other',
          severity: 'error',
        })
      }
      if (hasExpressions && hasEntryPoints) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message:
            'Action node cannot have both "expressions" and "entry_points". Use one or the other',
          severity: 'error',
        })
      }
      if (hasRules && hasEntryPoints) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message:
            'Action node cannot have both "rules" and "entry_points". Use one or the other',
          severity: 'error',
        })
      }
    }
    if (type === 'switch') {
      const hasCases = node.cases !== undefined
      const hasRules = node.rules !== undefined
      if (hasCases && hasRules) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message: 'Switch node cannot have both "rules" and "cases". Use one or the other',
          severity: 'error',
        })
      }
      if (!hasCases && !hasRules) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message: 'Switch node must have either "cases" or "rules"',
          severity: 'error',
        })
      }
    }

    // Check node references based on type
    switch (type) {
      case 'action': {
        checkRef(
          nodeId,
          'next',
          node.next as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        // Check error.catch
        const error = node.error as Record<string, unknown> | undefined
        if (error?.catch) {
          checkRef(
            nodeId,
            'error/catch',
            error.catch as string,
            nodeIds,
            errors,
            hasOutgoing,
            hasIncoming,
          )
        }
        break
      }

      case 'switch': {
        const cases = node.cases as Record<string, unknown>[] | undefined
        if (cases) {
          for (let i = 0; i < cases.length; i++) {
            const c = cases[i]
            if (c) {
              checkRef(
                nodeId,
                `cases/${String(i)}/next`,
                c.next as string | undefined,
                nodeIds,
                errors,
                hasOutgoing,
                hasIncoming,
              )
            }
          }
        }
        checkRef(
          nodeId,
          'default',
          node.default as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        break
      }

      case 'parallel': {
        const branches = node.branches as string[] | undefined
        if (branches) {
          for (let i = 0; i < branches.length; i++) {
            const branch = branches[i]
            if (branch) {
              checkRef(
                nodeId,
                `branches/${String(i)}`,
                branch,
                nodeIds,
                errors,
                hasOutgoing,
                hasIncoming,
              )
            }
          }
        }
        checkRef(
          nodeId,
          'join',
          node.join as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        break
      }

      case 'wait': {
        checkRef(
          nodeId,
          'next',
          node.next as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        checkRef(
          nodeId,
          'timeout_next',
          node.timeout_next as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        break
      }

      case 'error': {
        checkRef(
          nodeId,
          'next',
          node.next as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        break
      }

      case 'trigger': {
        checkRef(
          nodeId,
          'next',
          node.next as string | undefined,
          nodeIds,
          errors,
          hasOutgoing,
          hasIncoming,
        )
        break
      }

      case 'terminal': {
        // Terminal nodes have no outgoing edges by design
        break
      }
    }
  }

  // join_strategy validation — only "all" and "first" are valid
  for (const [nodeId, nodeDef] of Object.entries(nodes)) {
    const node = nodeDef as Record<string, unknown>
    if (node.type === 'parallel' && node.join_strategy) {
      const strategy = node.join_strategy as string
      if (strategy !== 'all' && strategy !== 'first') {
        errors.push({
          path: `/nodes/${nodeId}/join_strategy`,
          message: `join_strategy "${strategy}" is not valid. Use "all" or "first" instead`,
          severity: 'error',
        })
      }
    }
  }

  // Check for orphan nodes
  // - Non-terminal: orphan if no incoming AND no outgoing edges
  // - Terminal: orphan if no incoming edges (terminals never have outgoing edges by design)
  for (const nodeId of nodeIds) {
    const node = nodes[nodeId] as Record<string, unknown>
    const type = node.type as string

    const incoming = hasIncoming.has(nodeId)
    const outgoing = hasOutgoing.has(nodeId)

    // Trigger nodes are roots — they must not have incoming edges
    if (type === 'trigger') {
      if (incoming) {
        errors.push({
          path: `/nodes/${nodeId}`,
          message: `Trigger node "${nodeId}" must not have incoming edges (triggers are flow roots)`,
          severity: 'error',
        })
      }
      continue
    }

    const isOrphan = type === 'terminal' ? !incoming && nodeIds.size > 1 : !incoming && !outgoing

    if (isOrphan) {
      errors.push({
        path: `/nodes/${nodeId}`,
        message:
          type === 'terminal'
            ? `Unreachable terminal node "${nodeId}" has no incoming edges`
            : `Orphan node "${nodeId}" has no incoming or outgoing edges`,
        severity: 'warning',
      })
    }
  }

  return errors
}

/**
 * Check a node reference and track edges for orphan detection.
 */
function checkRef(
  sourceNodeId: string,
  field: string,
  target: string | undefined,
  nodeIds: Set<string>,
  errors: ValidationError[],
  hasOutgoing: Set<string>,
  hasIncoming: Set<string>,
): void {
  if (target === undefined) {
    return
  }

  hasOutgoing.add(sourceNodeId)
  hasIncoming.add(target)

  if (!nodeIds.has(target)) {
    errors.push({
      path: `/nodes/${sourceNodeId}/${field}`,
      message: `Reference to non-existent node "${target}"`,
      severity: 'error',
    })
  }
}
