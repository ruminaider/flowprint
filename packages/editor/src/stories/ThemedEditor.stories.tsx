import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { SymbolSearchProvider, SymbolResult, SymbolDetail } from '../symbols/types'
import { FlowprintEditor } from '../components/FlowprintEditor'

const sampleDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'themed-flow',
  version: '1.0.0',
  lanes: {
    frontend: { label: 'Frontend', visibility: 'external', order: 0 },
    backend: { label: 'Backend', visibility: 'internal', order: 1 },
  },
  nodes: {
    start_action: {
      type: 'action',
      lane: 'frontend',
      label: 'Start Action',
      next: 'check_status',
      entry_points: [{ file: 'src/main.ts', symbol: 'handleStart' }],
    },
    check_status: {
      type: 'switch',
      lane: 'backend',
      label: 'Check Status',
      cases: [{ when: 'approved', next: 'done' }],
    },
    done: {
      type: 'terminal',
      lane: 'frontend',
      label: 'Done',
      outcome: 'success',
    },
  },
}

const mockResults: SymbolResult[] = [
  { file: 'src/main.ts', symbol: 'handleStart', kind: 'function', preview: 'export function handleStart()' },
  { file: 'src/api.ts', symbol: 'fetchData', kind: 'function', preview: 'async function fetchData()' },
  { file: 'src/types.ts', symbol: 'AppConfig', kind: 'interface', preview: 'interface AppConfig {' },
  { file: 'src/utils.ts', symbol: 'formatDate', kind: 'function', preview: 'export function formatDate(d: Date)' },
]

const mockSymbolSearch: SymbolSearchProvider = {
  name: 'mock',
  ready: true,
  search: (query: string): Promise<SymbolResult[]> => {
    const lower = query.toLowerCase()
    return Promise.resolve(mockResults.filter((r) => r.symbol.toLowerCase().includes(lower)))
  },
  resolve: (file: string, symbol: string): Promise<SymbolDetail | null> => {
    const found = mockResults.find((r) => r.file === file && r.symbol === symbol)
    if (!found) return Promise.resolve(null)
    return Promise.resolve({ ...found, startLine: 1, endLine: 10 })
  },
}

function ControlledEditor(props: {
  initialDoc: FlowprintDocument
  theme?: 'light' | 'dark' | 'system'
  symbolSearch?: SymbolSearchProvider
  showYamlPreview?: boolean
  showExportButton?: boolean
}) {
  const [doc, setDoc] = useState(props.initialDoc)
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <FlowprintEditor
        value={doc}
        onChange={setDoc}
        theme={props.theme}
        symbolSearch={props.symbolSearch}
        showYamlPreview={props.showYamlPreview}
        showExportButton={props.showExportButton}
      />
    </div>
  )
}

const meta: Meta = {
  title: 'Editor/ThemedEditor',
  parameters: { layout: 'fullscreen' },
}
export default meta

export const LightTheme: StoryObj = {
  render: () => <ControlledEditor initialDoc={sampleDoc} theme="light" />,
}

export const DarkTheme: StoryObj = {
  render: () => (
    <div style={{ background: '#1e1e2e' }}>
      <ControlledEditor initialDoc={sampleDoc} theme="dark" />
    </div>
  ),
}

export const SystemTheme: StoryObj = {
  render: () => <ControlledEditor initialDoc={sampleDoc} theme="system" />,
}

export const WithSymbolSearch: StoryObj = {
  render: () => (
    <ControlledEditor initialDoc={sampleDoc} symbolSearch={mockSymbolSearch} />
  ),
}

export const WithYamlPreview: StoryObj = {
  render: () => <ControlledEditor initialDoc={sampleDoc} showYamlPreview />,
}

export const WithExportButton: StoryObj = {
  render: () => <ControlledEditor initialDoc={sampleDoc} showExportButton />,
}
