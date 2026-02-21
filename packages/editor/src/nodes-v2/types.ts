import type { ComponentType } from 'react'
import type { NodeProps as ReactFlowNodeProps } from '@xyflow/react'

export interface NodeSpec {
  /** Node type key matching schema node types (e.g., 'action', 'switch') */
  type: string
  /** Human-readable name shown in UI (e.g., 'Action', 'Switch') */
  displayName: string
  /** Lucide icon component */
  icon: ComponentType<{ size?: number; className?: string }>
  /** CSS variable name for the node's accent color (e.g., '--fp-node-orange') */
  color: string
  /** Single-key shortcut for the toolbar (e.g., 'a', 's') */
  shortcut: string
  /** Component rendered on the canvas as the React Flow node */
  renderNode: ComponentType<ReactFlowNodeProps>
  /** Component rendered in the near-node property popover (quick edit) */
  renderProperties: ComponentType<NodePropertiesProps>
  /** Component rendered in the full tab editor (deep edit) */
  renderEditor: ComponentType<NodeEditorProps>
  /** Factory function returning default data for a new node of this type */
  defaultData: () => Record<string, unknown>
  /** Validate a node and return errors */
  validate: (node: unknown) => ValidationError[]
}

export interface NodePropertiesProps {
  nodeId: string
  data: Record<string, unknown>
  lanes: { id: string; label: string }[]
  onChange: (data: Record<string, unknown>) => void
}

export interface NodeEditorProps {
  nodeId: string
  data: Record<string, unknown>
  lanes: { id: string; label: string }[]
  onChange: (data: Record<string, unknown>) => void
}

export interface ValidationError {
  field: string
  message: string
}
