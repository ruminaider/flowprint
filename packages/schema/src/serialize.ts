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
  'metadata',
  'entry_points',
] as const

/**
 * Type-specific fields that come after the common prefix.
 * Order matters for deterministic output.
 */
const NODE_TYPE_FIELDS: Record<string, readonly string[]> = {
  action: ['next', 'error'],
  switch: ['cases', 'default'],
  parallel: ['branches', 'join', 'join_strategy'],
  wait: ['event', 'timeout', 'next', 'timeout_next'],
  error: ['next'],
  terminal: ['outcome'],
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
      rootMap.add(new Pair(key, serializeOrderedMap(doc.lanes)))
    } else if (key === 'metadata' && typeof value === 'object' && value !== null) {
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
function serializeNodes(
  nodes: Record<string, Node>,
): YAMLMap {
  const nodesMap = new YAMLMap()

  for (const [nodeId, node] of Object.entries(nodes)) {
    const nodeMap = serializeNode(node)
    nodesMap.add(new Pair(nodeId, nodeMap))
  }

  return nodesMap
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

    if (key === 'entry_points' && Array.isArray(value)) {
      nodeMap.add(new Pair(key, serializeEntryPoints(value as Array<Record<string, unknown>>)))
    } else if (key === 'cases' && Array.isArray(value)) {
      nodeMap.add(new Pair(key, serializeCases(value as Array<Record<string, unknown>>)))
    } else if (key === 'branches' && Array.isArray(value)) {
      const seq = new YAMLSeq()
      for (const branch of value as string[]) {
        seq.add(createScalar(branch))
      }
      nodeMap.add(new Pair(key, seq))
    } else if (key === 'error' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeErrorHandler(value as Record<string, unknown>)))
    } else if (key === 'metadata' && typeof value === 'object' && value !== null) {
      nodeMap.add(new Pair(key, serializeOrderedMap(value as Record<string, unknown>)))
    } else {
      nodeMap.add(new Pair(key, createScalar(value)))
    }
  }

  return nodeMap
}

/**
 * Serialize entry_points array with deterministic field order (file, symbol).
 */
function serializeEntryPoints(entryPoints: Array<Record<string, unknown>>): YAMLSeq {
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
 * Serialize switch cases array with deterministic field order (when, next).
 */
function serializeCases(cases: Array<Record<string, unknown>>): YAMLSeq {
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
 * Serialize a plain object as a YAMLMap, preserving insertion order of keys.
 */
function serializeOrderedMap(
  obj: Record<string, unknown>,
): YAMLMap {
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
