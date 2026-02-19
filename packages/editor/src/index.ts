import '@xyflow/react/dist/style.css'
import './styles/index.css'

// Core editor
export { FlowprintEditor } from './components/FlowprintEditor'
export type { FlowprintEditorProps } from './components/FlowprintEditor'
export { FlowprintViewer } from './components/FlowprintViewer'
export type { FlowprintViewerProps } from './components/FlowprintViewer'
export { ErrorBoundary } from './components/ErrorBoundary'
export type { ErrorBoundaryProps } from './components/ErrorBoundary'
export { ExportButton } from './components/ExportButton'
export type { ExportButtonProps } from './components/ExportButton'

// V2 components
export { Toolbar } from './components-v2/Toolbar'
export { TabBar } from './components-v2/TabBar'
export type { TabBarProps } from './components-v2/TabBar'
export { CommandPalette } from './components-v2/CommandPalette'
export { BottomPanel } from './components-v2/BottomPanel'
export type { BottomPanelProps } from './components-v2/BottomPanel'
export { Island } from './components-v2/Island'
export { NodePopover } from './components-v2/NodePopover'
export { ZoomControls } from './components-v2/ZoomControls'

// Node spec system
export type { NodeSpec } from './nodes-v2/types'
export { registerNodeSpec, getNodeSpec, getAllNodeSpecs } from './nodes-v2/registry'
export { nodeTypes } from './nodes-v2/specs'
export { edgeTypes } from './edges-v2'

// State
export { useFlowprintState } from './hooks/useFlowprintState'
export type {
  UseFlowprintStateReturn,
  UseFlowprintStateOptions,
  ConnectionConfig,
} from './hooks/useFlowprintState'

// Layout
export { computeLayout, computeEdges, computeLaneBands, autoLayout } from './layout'
export type { LaneBand, LayoutResult } from './layout'

// Symbol search
export type { SymbolResult, SymbolDetail, SymbolSearchProvider } from './symbols/types'
export { TreeSitterIndex } from './symbols/TreeSitterIndex'
export type { TreeSitterIndexOptions } from './symbols/TreeSitterIndex'
export { CodeSearchProvider } from './symbols/CodeSearchProvider'
export type { CodeSearchProviderOptions } from './symbols/CodeSearchProvider'
export { useSymbolSearch } from './symbols/useSymbolSearch'
export type { UseSymbolSearchOptions, UseSymbolSearchReturn } from './symbols/useSymbolSearch'

// Theme
export { useTheme } from './hooks/useTheme'
export type { ThemeMode, ResolvedTheme } from './hooks/useTheme'
