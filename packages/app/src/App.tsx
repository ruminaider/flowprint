import { useState, useCallback } from 'react'
import { FlowprintEditor, useTheme } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { ThemeMode } from '@ruminaider/flowprint-editor'
import { Header } from './components/Header'

const DEFAULT_DOC: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'untitled',
  version: '0.1.0',
  description: '',
  lanes: {},
  nodes: {},
}

export function App() {
  const [doc, setDoc] = useState<FlowprintDocument>(DEFAULT_DOC)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [dirty, setDirty] = useState(false)
  const resolvedTheme = useTheme(themeMode)

  const handleChange = useCallback((updated: FlowprintDocument) => {
    setDoc(updated)
    setDirty(true)
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) => {
      if (prev === 'system') return 'light'
      if (prev === 'light') return 'dark'
      return 'system'
    })
  }, [])

  return (
    <div
      className="fp-app"
      data-fp-theme={resolvedTheme}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}
    >
      <Header fileName={doc.name} dirty={dirty} themeMode={themeMode} onCycleTheme={cycleTheme} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <FlowprintEditor
          value={doc}
          onChange={handleChange}
          theme={themeMode}
          showYamlPreview
          showExportButton
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
