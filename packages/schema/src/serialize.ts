import { Document, Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml'
import type { FlowprintDocument, Node } from './types.js'

/**
 * Top-level key order for Flowprint documents.
 */
const TOP_LEVEL_KEY_ORDER = [
  'schema',
  'name',
  'version',
  'description',
  'metadata',
  'secrets',
  'workflow',
  'lanes',
  'nodes',
] as const

/**
 * Common node key order (shared prefix for all node types).
 */
const NODE_KEY_PREFIX = [
  'type',
  'lane',
  'label',
  'description',
  'notes',
  'data_class',
  'metadata',
  'position',
  'entry_points',
] as const

/**
 * Type-specific fields that come after the common prefix.
 * Order matters for deterministic output.
 */
const NODE_TYPE_FIELDS: Record<string, readonly string[]> = {
  action: ['rules', 'expressions', 'inputs', 'compensation', 'temporal', 'next', 'error'],
  switch: ['rules', 'cases', 'default'],
  parallel: ['branches', 'join', 'join_strategy'],
  wait: ['event', 'event_type', 'event_type_import', 'timeout', 'next', 'timeout_next'],
  error: ['next'],
  terminal: ['outcome'],
  trigger: ['trigger_type', 'schedule', 'webhook', 'event', 'manual', 'next'],
}

/**
 * Serialize a FlowprintDocument to canonical YAML.
 *
 * This is the ONLY sanctioned way to produce `.flowprint.yaml` output.
 * Both the editor and CLI must use this function.
 *
 * Rules:
 * - Key order (top-level): schema, name, version, description, metadata, lanes, nodes
 * - Key order (nodes): type, lane, label, description, metadata, entry_points, then type-specific
 * - 2-space indentation
 * - Block style for all objects/arrays, no flow style except empty arrays
 * - Strings unquoted when valid YAML, quoted only when required
 * - Trailing newline: files end with single newline
 */
export function serialize(doc: FlowprintDocument): string {
  const yamlDoc = new Document(undefined, { toStringDefaults: { indent: 2 } })

  const rootMap = new YAMLMap()

  for (const key of TOP_LEVEL_KEY_ORDER) {
    const value = doc[key as keyof FlowprintDocument]
    if (value === undefined) continue

    if (key === 'nodes') {
      rootMap.add(new Pair(key, serializeNodes(doc.nodes)))
    } else if (key === 'lanes') {
      rootMap.add(new Pair(key, serializeLanes(doc.lanes)))
    } else if (key === 'metadata' && typeof value === 'object') {
      rootMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else if (key === 'workflow' && typeof value === 'object') {
      rootMap.add(new Pair(key, serializeWorkflow(value as Record<string, unknown>)))
    } else if (key === 'secrets' && typeof value === 'object') {
      rootMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else {
      rootMap.add(new Pair(key, createScalar(value)))
    }
  }

  yamlDoc.contents = rootMap

  const output = yamlDoc.toString({
    indent: 2,
    lineWidth: 0,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
    blockQuote: 'literal',
    collectionStyle: 'block',
  })

  // Ensure single trailing newline
  return output.endsWith('\n') ? output : output + '\n'
}

/**
 * Serialize the nodes map with deterministic key ordering per node type.
 */
function serializeNodes(nodes: Record<string, Node>): YAMLMap {
  const nodesMap = new YAMLMap()

  for (const [nodeId, node] of Object.entries(nodes)) {
    const nodeMap = serializeNode(node)
    nodesMap.add(new Pair(nodeId, nodeMap))
  }

  return nodesMap
}

/**
 * Lane key order for deterministic output.
 */
const LANE_KEY_ORDER = ['label', 'visibility', 'order', 'data_class', 'height'] as const

/**
 * Serialize the lanes map with deterministic key ordering per lane.
 */
function serializeLanes(
  lanes: Record<string, import('./types.js').Lane>,
): YAMLMap {
  const lanesMap = new YAMLMap()

  for (const [laneId, lane] of Object.entries(lanes)) {
    const laneMap = new YAMLMap()
    const laneObj = lane as unknown as Record<string, unknown>

    for (const key of LANE_KEY_ORDER) {
      const value = laneObj[key]
      if (value === undefined) continue

      if (key === 'data_class' && Array.isArray(value)) {
        const seq = new YAMLSeq()
        for (const item of value as string[]) {
          seq.add(createScalar(item))
        }
        laneMap.add(new Pair(key, seq))
      } else {
        laneMap.add(new Pair(key, createScalar(value)))
      }
    }

    lanesMap.add(new Pair(laneId, laneMap))
  }

  return lanesMap
}

/**
 * Serialize a single node with deterministic key ordering.
 */
function serializeNode(node: Node): YAMLMap {
  const nodeMap = new YAMLMap()
  const nodeObj = node as unknown as Record<string, unknown>
  const typeFields = NODE_TYPE_FIELDS[node.type] ?? []
  const allKeys = [...NODE_KEY_PREFIX, ...typeFields]

  for (const key of allKeys) {
    const value = nodeObj[key]
    if (value === undefined) continue

    if (key === 'data_class' && Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const item of value as string[]) {
        seq.add(createScalar(item))
      }
      nodeMap.add(new Pair(key, seq))
    } else if (key === 'rules' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeRulesRef(value as Record<string, unknown>)))
    } else if (key === 'expressions' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else if (key === 'entry_points' && Array.isArray(value)) {
      nodeMap.add(new Pair(key, serializeEntryPoints(value as Record<string, unknown>[])))
    } else if (key === 'cases' && Array.isArray(value)) {
      nodeMap.add(new Pair(key, serializeCases(value as Record<string, unknown>[])))
    } else if (key === 'branches' && Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const branch of value as string[]) {
        seq.add(createScalar(branch))
      }
      nodeMap.add(new Pair(key, seq))
    } else if (key === 'inputs' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else if (key === 'compensation' && typeof value === 'object' && value !== null) {
      const compMap = new YAMLMap()
      const comp = value as Record<string, unknown>
      if (comp.file !== undefined) compMap.add(new Pair('file', createScalar(comp.file)))
      if (comp.symbol !== undefined) compMap.add(new Pair('symbol', createScalar(comp.symbol)))
      nodeMap.add(new Pair(key, compMap))
    } else if (key === 'temporal' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeTemporalConfig(value as Record<string, unknown>)))
    } else if (key === 'error' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeErrorHandler(value as Record<string, unknown>)))
    } else if (key === 'position' && typeof value === 'object' && value !== null) {
      const pos = value as Record<string, unknown>
      const posMap = new YAMLMap()
      if (pos.x !== undefined) posMap.add(new Pair('x', createScalar(pos.x)))
      if (pos.y !== undefined) posMap.add(new Pair('y', createScalar(pos.y)))
      nodeMap.add(new Pair(key, posMap))
    } else if (key === 'metadata' && typeof value === 'object') {
      nodeMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else if (
      (key === 'schedule' || key === 'webhook' || key === 'event' || key === 'manual') &&
      typeof value === 'object' &&
      value !== null
    ) {
      nodeMap.add(new Pair(key, serializeTriggerConfig(value as Record<string, unknown>)))
    } else {
      nodeMap.add(new Pair(key, createScalar(value)))
    }
  }

  return nodeMap
}

/**
 * Serialize entry_points array with deterministic field order (file, symbol).
 */
function serializeEntryPoints(entryPoints: Record<string, unknown>[]): YAMLSeq {
  const seq = new YAMLSeq()

  for (const ep of entryPoints) {
    const epMap = new YAMLMap()
    if (ep.file !== undefined) epMap.add(new Pair('file', createScalar(ep.file)))
    if (ep.symbol !== undefined) epMap.add(new Pair('symbol', createScalar(ep.symbol)))
    seq.add(epMap)
  }

  return seq
}

/**
 * Serialize rules reference with deterministic field order (file, evaluator).
 */
function serializeRulesRef(rules: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()
  if (rules.file !== undefined) map.add(new Pair('file', createScalar(rules.file)))
  if (rules.evaluator !== undefined) map.add(new Pair('evaluator', createScalar(rules.evaluator)))
  return map
}

/**
 * Serialize switch cases array with deterministic field order (when, next).
 */
function serializeCases(cases: Record<string, unknown>[]): YAMLSeq {
  const seq = new YAMLSeq()

  for (const c of cases) {
    const caseMap = new YAMLMap()
    if (c.when !== undefined) caseMap.add(new Pair('when', createScalar(c.when)))
    if (c.next !== undefined) caseMap.add(new Pair('next', createScalar(c.next)))
    seq.add(caseMap)
  }

  return seq
}

/**
 * Serialize error handler with deterministic field order (retry, catch).
 */
function serializeErrorHandler(error: Record<string, unknown>): YAMLMap {
  const errorMap = new YAMLMap()

  if (error.retry !== undefined && typeof error.retry === 'object' && error.retry !== null) {
    const retry = error.retry as Record<string, unknown>
    const retryMap = new YAMLMap()
    if (retry.limit !== undefined) retryMap.add(new Pair('limit', createScalar(retry.limit)))
    if (retry.backoff !== undefined) retryMap.add(new Pair('backoff', createScalar(retry.backoff)))
    errorMap.add(new Pair('retry', retryMap))
  }

  if (error.catch !== undefined) {
    errorMap.add(new Pair('catch', createScalar(error.catch)))
  }

  return errorMap
}

/**
 * Serialize workflow-level configuration with deterministic key order.
 */
function serializeWorkflow(workflow: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()
  const keyOrder = ['task_queue', 'execution_timeout', 'input_type', 'input_type_import']
  for (const key of keyOrder) {
    const value = workflow[key]
    if (value !== undefined) {
      map.add(new Pair(key, createScalar(value)))
    }
  }
  return map
}

/**
 * Serialize Temporal activity configuration with deterministic key order.
 */
function serializeTemporalConfig(temporal: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()
  const keyOrder = [
    'start_to_close_timeout',
    'schedule_to_close_timeout',
    'heartbeat_timeout',
    'retry',
  ]
  for (const key of keyOrder) {
    const value = temporal[key]
    if (value === undefined) continue
    if (key === 'retry' && typeof value === 'object' && value !== null) {
      map.add(new Pair(key, serializeTemporalRetry(value as Record<string, unknown>)))
    } else {
      map.add(new Pair(key, createScalar(value)))
    }
  }
  return map
}

/**
 * Serialize Temporal retry policy with deterministic key order.
 */
function serializeTemporalRetry(retry: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()
  const keyOrder = [
    'max_attempts',
    'backoff_coefficient',
    'initial_interval',
    'max_interval',
    'non_retryable_errors',
  ]
  for (const key of keyOrder) {
    const value = retry[key]
    if (value === undefined) continue
    if (key === 'non_retryable_errors' && Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const item of value as string[]) {
        seq.add(createScalar(item))
      }
      map.add(new Pair(key, seq))
    } else {
      map.add(new Pair(key, createScalar(value)))
    }
  }
  return map
}

/**
 * Serialize a trigger config object (schedule, webhook, event, manual).
 * Handles nested objects and arrays (e.g., manual.form_fields).
 */
function serializeTriggerConfig(obj: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          seq.add(serializeOrderedMap(item as Record<string, unknown>))
        } else {
          seq.add(createScalar(item))
        }
      }
      map.add(new Pair(key, seq))
    } else if (typeof value === 'object' && value !== null) {
      map.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else {
      map.add(new Pair(key, createScalar(value)))
    }
  }

  return map
}

/**
 * Serialize a plain object as a YAMLMap, preserving insertion order of keys.
 */
function serializeOrderedMap(obj: Record<string, unknown>): YAMLMap {
  const map = new YAMLMap()

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      map.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else {
      map.add(new Pair(key, createScalar(value)))
    }
  }

  return map
}

/**
 * Create a YAML scalar with appropriate type handling.
 * Lets the yaml library auto-detect quoting for round-trip safety
 * (e.g., 'true', 'null', '1.0' must be quoted to preserve string type).
 */
function createScalar(value: unknown): Scalar {
  return new Scalar(value)
}
