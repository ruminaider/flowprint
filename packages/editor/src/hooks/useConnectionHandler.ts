import { useCallback, useState } from 'react'
import type { Connection, Edge } from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isTerminalNode, isSwitchNode, isParallelNode } from '@ruminaider/flowprint-schema'
import type { UseFlowprintStateReturn, ConnectionConfig } from './useFlowprintState'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PendingSwitchConnection {
  source: string
  target: string
}

export interface UseConnectionHandlerReturn {
  onConnect: (connection: Connection) => void
  isValidConnection: (connection: Connection | Edge) => boolean
  pendingSwitchConnection: PendingSwitchConnection | null
  confirmSwitchConnection: (when: string, isDefault?: boolean) => void
  cancelSwitchConnection: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConnectionHandler(
  state: UseFlowprintStateReturn,
  doc: FlowprintDocument,
): UseConnectionHandlerReturn {
  const [pendingSwitchConnection, setPendingSwitchConnection] =
    useState<PendingSwitchConnection | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => {
      const { source, target } = connection

      // Reject self-loops
      if (source === target) return

      const sourceNode = doc.nodes[source]
      if (!sourceNode) return

      // Terminal nodes have no outgoing connections
      if (isTerminalNode(sourceNode)) return

      // Switch nodes require a popover to choose the case condition
      if (isSwitchNode(sourceNode)) {
        setPendingSwitchConnection({ source, target })
        return
      }

      // Parallel nodes add a branch
      if (isParallelNode(sourceNode)) {
        state.connectNodes(source, target, { type: 'parallel_branch' })
        return
      }

      // Action, wait, error nodes use 'next'
      state.connectNodes(source, target, { type: 'next' })
    },
    [doc.nodes, state],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const { source, target } = connection

      // Reject self-loops
      if (source === target) return false

      const sourceNode = doc.nodes[source]
      if (!sourceNode) return false

      // Terminal nodes cannot have outgoing connections
      if (isTerminalNode(sourceNode)) return false

      return true
    },
    [doc.nodes],
  )

  const confirmSwitchConnection = useCallback(
    (when: string, isDefault?: boolean) => {
      if (!pendingSwitchConnection) return

      const { source, target } = pendingSwitchConnection
      const config: ConnectionConfig = isDefault
        ? { type: 'switch_default' }
        : { type: 'switch_case', when }

      state.connectNodes(source, target, config)
      setPendingSwitchConnection(null)
    },
    [pendingSwitchConnection, state],
  )

  const cancelSwitchConnection = useCallback(() => {
    setPendingSwitchConnection(null)
  }, [])

  return {
    onConnect,
    isValidConnection,
    pendingSwitchConnection,
    confirmSwitchConnection,
    cancelSwitchConnection,
  }
}
