import '@xyflow/react/dist/style.css'
import './styles.css'

export { FlowprintViewer } from './components/FlowprintViewer'
export type { FlowprintViewerProps } from './components/FlowprintViewer'
export { computeLayout } from './layout'
export type { LaneBand, LayoutResult } from './layout'
export { FlowprintEditor } from './components/FlowprintEditor'
export type { FlowprintEditorProps } from './components/FlowprintEditor'
export { useFlowprintState } from './hooks/useFlowprintState'
export type {
  UseFlowprintStateReturn,
  UseFlowprintStateOptions,
  ConnectionConfig,
} from './hooks/useFlowprintState'
export { ErrorBoundary } from './components/ErrorBoundary'
export type { ErrorBoundaryProps } from './components/ErrorBoundary'
export { NodePalette } from './components/NodePalette'
export { PropertiesPanel } from './panels/PropertiesPanel'
export type { PropertiesPanelProps } from './panels/PropertiesPanel'
export { LanePanel } from './panels/LanePanel'
export type { LanePanelProps } from './panels/LanePanel'

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

// Panels
export { YamlPreviewPanel } from './panels/YamlPreviewPanel'
export type { YamlPreviewPanelProps } from './panels/YamlPreviewPanel'

// Components
export { ExportButton } from './components/ExportButton'
export type { ExportButtonProps } from './components/ExportButton'
