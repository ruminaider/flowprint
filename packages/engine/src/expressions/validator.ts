import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { topoSort, isSwitchNode, isActionNode } from '@ruminaider/flowprint-schema'
import { parseExpression } from './parser.js'

export interface ExpressionValidationError {
  path: string
  message: string
}

export interface ExpressionValidationResult {
  valid: boolean
  errors: ExpressionValidationError[]
}

export function validateExpressions(doc: FlowprintDocument): ExpressionValidationResult {
  const errors: ExpressionValidationError[] = []

  // Get topological order
  const sorted = topoSort(doc)
  const nodesBefore = new Map<string, Set<string>>()

  // Build the "before" map from topo order
  const seenNodes = new Set<string>()
  for (const ordered of sorted) {
    nodesBefore.set(ordered.id, new Set(seenNodes))
    seenNodes.add(ordered.id)
  }

  const allNodeIds = new Set(Object.keys(doc.nodes))

  for (const [nodeId, node] of Object.entries(doc.nodes)) {
    // Validate switch expressions
    if (isSwitchNode(node)) {
      for (let i = 0; i < (node.cases?.length ?? 0); i++) {
        const c = node.cases?.[i]
        if (c) {
          validateSingleExpression(
            c.when,
            `/nodes/${nodeId}/cases/${String(i)}/when`,
            nodeId,
            allNodeIds,
            nodesBefore,
            errors,
          )
        }
      }
    }

    // Validate action input expressions
    if (isActionNode(node) && node.inputs) {
      for (const [inputName, expr] of Object.entries(node.inputs)) {
        validateSingleExpression(
          expr,
          `/nodes/${nodeId}/inputs/${inputName}`,
          nodeId,
          allNodeIds,
          nodesBefore,
          errors,
        )
      }
    }

    // Action nodes must have exactly one entry_point or a rules reference
    if (isActionNode(node)) {
      const epCount = node.entry_points?.length ?? 0
      const hasRules = Boolean(node.rules)
      if (epCount !== 1 && !hasRules) {
        errors.push({
          path: `/nodes/${nodeId}/entry_points`,
          message: `Action nodes must have exactly one entry_point for execution (found ${String(epCount)})`,
        })
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

function validateSingleExpression(
  expr: string,
  path: string,
  currentNodeId: string,
  allNodeIds: Set<string>,
  nodesBefore: Map<string, Set<string>>,
  errors: ExpressionValidationError[],
): void {
  const result = parseExpression(expr)

  if (!result.success) {
    for (const err of result.errors) {
      errors.push({
        path,
        message: `Parse error: ${err.message}`,
      })
    }
    return
  }

  const before = nodesBefore.get(currentNodeId) ?? new Set()

  for (const id of result.expression.identifiers) {
    // 'input' is always valid — it refers to the workflow input
    if (id === 'input') continue

    if (!allNodeIds.has(id)) {
      errors.push({
        path,
        message: `Expression references unknown node: ${id}`,
      })
    } else if (!before.has(id)) {
      errors.push({
        path,
        message: `Expression references node '${id}' which does not come before '${currentNodeId}' in topological order`,
      })
    }
  }
}
