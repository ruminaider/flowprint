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

// Components
export { Toolbar } from './components/Toolbar'
export { TabBar } from './components/TabBar'
export type { TabBarProps } from './components/TabBar'
export { CommandPalette } from './components/CommandPalette'
export { BottomPanel } from './components/BottomPanel'
export type { BottomPanelProps } from './components/BottomPanel'
export { Island } from './components/Island'
export { NodePopover } from './components/NodePopover'
export { ZoomControls } from './components/ZoomControls'

// Node spec system
export type { NodeSpec } from './nodes/types'
export { registerNodeSpec, getNodeSpec, getAllNodeSpecs } from './nodes/registry'
export { nodeTypes } from './nodes/specs'
export { edgeTypes } from './edges'

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

// Rules data context
export { RulesDataProvider, useRulesData } from './contexts/RulesDataContext'
export type { RulesDataMap, RulesDataEntry } from './contexts/RulesDataContext'

// Theme
export { useTheme } from './hooks/useTheme'
export type { ThemeMode, ResolvedTheme } from './hooks/useTheme'
