import { useCallback, useRef, useState } from 'react'
import type { FlowprintDocument, Node, Lane, Position } from '@ruminaider/flowprint-schema'
import {
  isActionNode,
  isSwitchNode,
  isParallelNode,
  isWaitNode,
  isErrorNode,
  isTerminalNode,
} from '@ruminaider/flowprint-schema'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Discriminated union describing how to wire a connection between two nodes.
 *
 * Each variant corresponds to a specific edge type in the Flowprint schema:
 * - `next` -- standard sequential flow
 * - `switch_case` -- conditional branch with a `when` expression
 * - `switch_default` -- default branch of a switch node
 * - `parallel_branch` -- one branch of a parallel fork
 * - `parallel_join` -- join target after parallel branches converge
 * - `timeout_next` -- path taken when a wait node times out
 * - `error_catch` -- error handler path on an action node
 */
export type ConnectionConfig =
  | { type: 'next' }
  | { type: 'switch_case'; when: string }
  | { type: 'switch_default' }
  | { type: 'parallel_branch' }
  | { type: 'parallel_join' }
  | { type: 'timeout_next' }
  | { type: 'error_catch' }

/**
 * Options for the {@link useFlowprintState} hook.
 */
export interface UseFlowprintStateOptions {
  /** The initial document to load into the editor state. Cloned internally. */
  initialDoc: FlowprintDocument
  /** Optional callback fired after every document mutation. */
  onChange?: (doc: FlowprintDocument) => void
  /** Maximum number of undo history entries to keep. Defaults to 50. */
  maxHistory?: number
}

/**
 * Return value of the {@link useFlowprintState} hook.
 *
 * Provides the current document, mutation methods for nodes/lanes/connections,
 * and undo/redo capabilities.
 */
export interface UseFlowprintStateReturn {
  /** The current document state. */
  doc: FlowprintDocument
  /** Add a new node to the document. */
  addNode(id: string, node: Node): void
  /** Update properties of an existing node via a partial patch. */
  updateNode(id: string, patch: Partial<Node>): void
  /** Update the stored position of a node in the document. */
  updateNodePosition(id: string, position: Position): void
  /** Update positions of multiple nodes in a single commit (for auto-layout / tidy). */
  batchUpdatePositions(positions: Map<string, { x: number; y: number }>): void
  /** Remove a node and purge all references to it from other nodes. */
  removeNode(id: string): void
  /** Create a connection between two nodes using the specified configuration. */
  connectNodes(source: string, target: string, config: ConnectionConfig): void
  /** Remove a specific connection between two nodes. */
  disconnectNodes(source: string, target: string): void
  /** Add a new lane to the document. */
  addLane(id: string, lane: Lane): void
  /** Update properties of an existing lane via a partial patch. */
  updateLane(id: string, patch: Partial<Lane>): void
  /** Resize a lane and shift nodes in lower lanes to keep them in their bands. */
  resizeLane(id: string, newHeight: number, oldEffectiveHeight: number): void
  /** Remove a lane from the document. */
  removeLane(id: string): void
  /** Reorder lanes by providing an ordered array of lane IDs. */
  reorderLanes(orderedIds: string[]): void
  /** Undo the last document mutation. */
  undo(): void
  /** Redo a previously undone mutation. */
  redo(): void
  /** Whether there are mutations available to undo. */
  canUndo: boolean
  /** Whether there are mutations available to redo. */
  canRedo: boolean
  /** Replace the entire document (for external sync). Does not push to undo history. */
  setDoc(doc: FlowprintDocument): void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_HISTORY = 50

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Remove all references to `targetId` from every node in the document.
 * Mutates `nodes` in place (caller should have already cloned).
 */
function purgeNodeReferences(nodes: Record<string, Node>, targetId: string): void {
  for (const node of Object.values(nodes)) {
    if (isActionNode(node)) {
      if (node.next === targetId) node.next = undefined
      if (node.error?.catch === targetId) node.error.catch = undefined
    } else if (isSwitchNode(node)) {
      // Remove matching cases; keep at least the tuple shape valid
      const filtered = node.cases.filter((c) => c.next !== targetId)
      // cases is a non-empty tuple in the schema, but during editing it may
      // temporarily be empty. We cast to keep TS happy.
      node.cases = (filtered.length > 0 ? filtered : []) as typeof node.cases
      if (node.default === targetId) node.default = undefined
    } else if (isParallelNode(node)) {
      const filtered = node.branches.filter((b) => b !== targetId)
      node.branches = (filtered.length > 0 ? filtered : []) as typeof node.branches
      if (node.join === targetId) node.join = '' // join is required, use empty sentinel
    } else if (isWaitNode(node)) {
      if (node.next === targetId) node.next = undefined
      if (node.timeout_next === targetId) node.timeout_next = undefined
    } else if (isErrorNode(node)) {
      if (node.next === targetId) node.next = undefined
    }
    // TerminalNode has no outgoing references
  }
}

/**
 * Apply a connection from `source` to `target` based on `config`.
 * Mutates `sourceNode` in place (caller should have already cloned).
 */
function applyConnection(sourceNode: Node, target: string, config: ConnectionConfig): void {
  switch (config.type) {
    case 'next': {
      if (isTerminalNode(sourceNode)) {
        throw new Error('Terminal nodes cannot have outgoing connections')
      }
      if (isActionNode(sourceNode) || isWaitNode(sourceNode) || isErrorNode(sourceNode)) {
        sourceNode.next = target
      } else {
        throw new Error(`Cannot set 'next' on node type '${sourceNode.type}'`)
      }
      break
    }
    case 'switch_case': {
      if (!isSwitchNode(sourceNode)) {
        throw new Error(`switch_case connection requires a switch node`)
      }
      sourceNode.cases = [
        ...sourceNode.cases,
        { when: config.when, next: target },
      ] as typeof sourceNode.cases
      break
    }
    case 'switch_default': {
      if (!isSwitchNode(sourceNode)) {
        throw new Error(`switch_default connection requires a switch node`)
      }
      sourceNode.default = target
      break
    }
    case 'parallel_branch': {
      if (!isParallelNode(sourceNode)) {
        throw new Error(`parallel_branch connection requires a parallel node`)
      }
      sourceNode.branches = [...sourceNode.branches, target] as typeof sourceNode.branches
      break
    }
    case 'parallel_join': {
      if (!isParallelNode(sourceNode)) {
        throw new Error(`parallel_join connection requires a parallel node`)
      }
      sourceNode.join = target
      break
    }
    case 'timeout_next': {
      if (!isWaitNode(sourceNode)) {
        throw new Error(`timeout_next connection requires a wait node`)
      }
      sourceNode.timeout_next = target
      break
    }
    case 'error_catch': {
      if (!isActionNode(sourceNode)) {
        throw new Error(`error_catch connection requires an action node`)
      }
      if (!sourceNode.error) {
        sourceNode.error = { catch: target }
      } else {
        sourceNode.error.catch = target
      }
      break
    }
  }
}

/**
 * Remove a specific connection from `sourceNode` to `target`.
 * Mutates in place.
 */
function removeConnection(sourceNode: Node, target: string): void {
  if (isActionNode(sourceNode)) {
    if (sourceNode.next === target) sourceNode.next = undefined
    if (sourceNode.error?.catch === target) sourceNode.error.catch = undefined
  } else if (isSwitchNode(sourceNode)) {
    const filtered = sourceNode.cases.filter((c) => c.next !== target)
    sourceNode.cases = (filtered.length > 0 ? filtered : []) as typeof sourceNode.cases
    if (sourceNode.default === target) sourceNode.default = undefined
  } else if (isParallelNode(sourceNode)) {
    const filtered = sourceNode.branches.filter((b) => b !== target)
    sourceNode.branches = (filtered.length > 0 ? filtered : []) as typeof sourceNode.branches
    if (sourceNode.join === target) sourceNode.join = ''
  } else if (isWaitNode(sourceNode)) {
    if (sourceNode.next === target) sourceNode.next = undefined
    if (sourceNode.timeout_next === target) sourceNode.timeout_next = undefined
  } else if (isErrorNode(sourceNode)) {
    if (sourceNode.next === target) sourceNode.next = undefined
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook that manages the mutable state of a Flowprint document.
 *
 * Provides immutable-update semantics with `structuredClone`, a full undo/redo
 * history stack, and granular mutation methods for nodes, lanes, and connections.
 *
 * @param options - Initial document, change callback, and history size.
 * @returns Mutation methods, undo/redo, and the current document.
 *
 * @example
 * ```ts
 * const state = useFlowprintState({ initialDoc: doc, onChange: setDoc })
 * state.addNode('new_step', { type: 'action', lane: 'backend', label: 'Process' })
 * ```
 */
export function useFlowprintState(options: UseFlowprintStateOptions): UseFlowprintStateReturn {
  const { initialDoc, onChange, maxHistory = DEFAULT_MAX_HISTORY } = options

  const [doc, setDocState] = useState<FlowprintDocument>(() => structuredClone(initialDoc))
  const pastRef = useRef<FlowprintDocument[]>([])
  const futureRef = useRef<FlowprintDocument[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // -----------------------------------------------------------------------
  // Core mutation helper
  // -----------------------------------------------------------------------

  const commit = useCallback(
    (mutate: (draft: FlowprintDocument) => void) => {
      setDocState((current) => {
        const draft = structuredClone(current)
        mutate(draft)

        // Push current onto past, trim if needed
        pastRef.current = [...pastRef.current, current]
        if (pastRef.current.length > maxHistory) {
          pastRef.current = pastRef.current.slice(pastRef.current.length - maxHistory)
        }
        // Clear future
        futureRef.current = []

        setCanUndo(true)
        setCanRedo(false)

        onChange?.(draft)
        return draft
      })
    },
    [maxHistory, onChange],
  )

  // -----------------------------------------------------------------------
  // Node mutations
  // -----------------------------------------------------------------------

  const addNode = useCallback(
    (id: string, node: Node) => {
      commit((draft) => {
        draft.nodes[id] = node
      })
    },
    [commit],
  )

  const updateNode = useCallback(
    (id: string, patch: Partial<Node>) => {
      commit((draft) => {
        const existing = draft.nodes[id]
        if (!existing) throw new Error(`Node '${id}' not found`)
        draft.nodes[id] = { ...existing, ...patch } as Node
      })
    },
    [commit],
  )

  const updateNodePosition = useCallback(
    (id: string, position: Position) => {
      commit((draft) => {
        const node = draft.nodes[id]
        if (!node) return
        node.position = position
      })
    },
    [commit],
  )

  const batchUpdatePositions = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      commit((draft) => {
        for (const [id, pos] of positions) {
          const node = draft.nodes[id]
          if (node) node.position = pos
        }
      })
    },
    [commit],
  )

  const removeNode = useCallback(
    (id: string) => {
      commit((draft) => {
        Reflect.deleteProperty(draft.nodes, id)
        purgeNodeReferences(draft.nodes, id)
      })
    },
    [commit],
  )

  // -----------------------------------------------------------------------
  // Connection mutations
  // -----------------------------------------------------------------------

  const connectNodes = useCallback(
    (source: string, target: string, config: ConnectionConfig) => {
      commit((draft) => {
        const sourceNode = draft.nodes[source]
        if (!sourceNode) throw new Error(`Source node '${source}' not found`)
        applyConnection(sourceNode, target, config)
      })
    },
    [commit],
  )

  const disconnectNodes = useCallback(
    (source: string, target: string) => {
      commit((draft) => {
        const sourceNode = draft.nodes[source]
        if (!sourceNode) throw new Error(`Source node '${source}' not found`)
        removeConnection(sourceNode, target)
      })
    },
    [commit],
  )

  // -----------------------------------------------------------------------
  // Lane mutations
  // -----------------------------------------------------------------------

  const addLane = useCallback(
    (id: string, lane: Lane) => {
      commit((draft) => {
        draft.lanes[id] = lane
      })
    },
    [commit],
  )

  const updateLane = useCallback(
    (id: string, patch: Partial<Lane>) => {
      commit((draft) => {
        const existing = draft.lanes[id]
        if (!existing) throw new Error(`Lane '${id}' not found`)
        draft.lanes[id] = { ...existing, ...patch }
      })
    },
    [commit],
  )

  const resizeLane = useCallback(
    (id: string, newHeight: number, oldEffectiveHeight: number) => {
      commit((draft) => {
        const lane = draft.lanes[id]
        if (!lane) throw new Error(`Lane '${id}' not found`)
        draft.lanes[id] = { ...lane, height: newHeight }

        // Shift nodes in lanes below so they stay in their bands
        const delta = newHeight - oldEffectiveHeight
        if (delta === 0) return
        const resizedOrder = lane.order
        const lowerLaneIds = new Set(
          Object.entries(draft.lanes)
            .filter(([, l]) => l.order > resizedOrder)
            .map(([lid]) => lid),
        )
        for (const [, node] of Object.entries(draft.nodes)) {
          if (lowerLaneIds.has(node.lane) && node.position) {
            node.position = { x: node.position.x, y: node.position.y + delta }
          }
        }
      })
    },
    [commit],
  )

  const removeLane = useCallback(
    (id: string) => {
      commit((draft) => {
        Reflect.deleteProperty(draft.lanes, id)
      })
    },
    [commit],
  )

  const reorderLanes = useCallback(
    (orderedIds: string[]) => {
      commit((draft) => {
        for (let i = 0; i < orderedIds.length; i++) {
          const id = orderedIds[i]
          if (!id) continue
          const lane = draft.lanes[id]
          if (lane) {
            lane.order = i
          }
        }
      })
    },
    [commit],
  )

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------

  const undo = useCallback(() => {
    setDocState((current) => {
      const prev = pastRef.current[pastRef.current.length - 1]
      if (!prev) return current

      pastRef.current = pastRef.current.slice(0, -1)
      futureRef.current = [...futureRef.current, current]
      setCanUndo(pastRef.current.length > 0)
      setCanRedo(true)
      onChange?.(prev)
      return prev
    })
  }, [onChange])

  const redo = useCallback(() => {
    setDocState((current) => {
      const next = futureRef.current[futureRef.current.length - 1]
      if (!next) return current

      futureRef.current = futureRef.current.slice(0, -1)
      pastRef.current = [...pastRef.current, current]
      setCanUndo(true)
      setCanRedo(futureRef.current.length > 0)
      onChange?.(next)
      return next
    })
  }, [onChange])

  // -----------------------------------------------------------------------
  // Controlled mode sync
  // -----------------------------------------------------------------------

  const setDoc = useCallback((newDoc: FlowprintDocument) => {
    setDocState(newDoc)
    // setDoc is for external sync -- do not push to history
  }, [])

  return {
    doc,
    addNode,
    updateNode,
    updateNodePosition,
    batchUpdatePositions,
    removeNode,
    connectNodes,
    disconnectNodes,
    addLane,
    updateLane,
    resizeLane,
    removeLane,
    reorderLanes,
    undo,
    redo,
    canUndo,
    canRedo,
    setDoc,
  }
}
