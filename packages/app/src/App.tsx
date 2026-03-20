import { useState, useCallback } from 'react'
import { FlowprintEditor, useTheme, useSymbolSearch } from '@ruminaider/flowprint-editor'
import type { RulesDataMap } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import './styles/app.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { Header } from './components/Header'
import { WelcomeScreen } from './components/WelcomeScreen'
import { NewBlueprintWizard } from './components/NewBlueprintWizard'
import { SettingsDialog } from './components/SettingsDialog'
import { SimulationPanel } from './components/SimulationPanel'
import { UnsavedChangesGuard } from './components/UnsavedChangesGuard'
import { useFileManager } from './hooks/useFileManager'
import { useProjectDirectory } from './hooks/useProjectDirectory'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useSettings } from './hooks/useSettings'
import { useSimulation } from './hooks/useSimulation'
import type { AppSettings } from './hooks/useSettings'
import type { RecentFile } from './hooks/useRecentFiles'

export function App() {
  const [doc, setDoc] = useState<FlowprintDocument | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showSimPanel, setShowSimPanel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rulesDataMap, setRulesDataMap] = useState<RulesDataMap>({})

  const settingsHook = useSettings()
  const { settings } = settingsHook
  const resolvedTheme = useTheme(settings.theme)
  const { recentFiles, addRecent } = useRecentFiles()

  const { provider: symbolSearch } = useSymbolSearch({
    codeSearchUrl: settings.codeSearchUrl || undefined,
  })

  const simulation = useSimulation(doc, rulesDataMap)

  // Gate on doc !== null only, not on rules presence
  const canSimulate = doc !== null

  const handleSimulate = useCallback(() => {
    if (simulation.isActive) {
      simulation.stop()
      setShowSimPanel(false)
    } else {
      setShowSimPanel(true)
    }
  }, [simulation])

  const handleDocLoaded = useCallback(
    (loaded: FlowprintDocument, fileName: string) => {
      setDoc(loaded)
      setError(null)
      void addRecent({ name: fileName, path: fileName })
    },
    [addRecent],
  )

  const handleFileDocLoaded = useCallback(
    (loaded: FlowprintDocument, fileName: string) => {
      setRulesDataMap({})
      handleDocLoaded(loaded, fileName)
    },
    [handleDocLoaded],
  )

  const handleError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  const fileManager = useFileManager({
    doc: doc ?? {
      schema: 'flowprint/1.0',
      name: 'untitled',
      version: '0.1.0',
      lanes: {},
      nodes: {},
    },
    onDocLoaded: handleFileDocLoaded,
    onError: handleError,
  })

  const projectDirectory = useProjectDirectory({
    onDocLoaded: handleDocLoaded,
    onRulesResolved: setRulesDataMap,
    onError: handleError,
  })

  const handleChange = useCallback(
    (updated: FlowprintDocument) => {
      setDoc(updated)
      fileManager.setDirty(true)
    },
    [fileManager],
  )

  const handleCreate = useCallback(
    (newDoc: FlowprintDocument) => {
      setDoc(newDoc)
      fileManager.setDirty(true)
      setWizardOpen(false)
      setError(null)
    },
    [fileManager],
  )

  const handleOpenRecent: (file: RecentFile) => void = useCallback(() => {
    void fileManager.openFile()
  }, [fileManager])

  const handleSettingsSave = useCallback(
    (updated: AppSettings) => {
      void settingsHook.updateSettings(updated)
      setSettingsOpen(false)
    },
    [settingsHook],
  )

  const cycleTheme = useCallback(() => {
    const next =
      settings.theme === 'system' ? 'light' : settings.theme === 'light' ? 'dark' : 'system'
    void settingsHook.updateSettings({ theme: next })
  }, [settings.theme, settingsHook])

  const handleClose = useCallback(() => {
    if (fileManager.dirty) {
      if (!window.confirm('You have unsaved changes. Discard and return to the welcome screen?')) {
        return
      }
    }
    simulation.stop()
    setShowSimPanel(false)
    setDoc(null)
    fileManager.setDirty(false)
    setRulesDataMap({})
    setError(null)
  }, [fileManager, simulation])

  return (
    <div
      className="fp-app"
      data-fp-theme={resolvedTheme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-page)',
      }}
    >
      <UnsavedChangesGuard dirty={fileManager.dirty} />

      {doc === null ? (
        <>
          <Header
            fileName={null}
            dirty={false}
            themeMode={settings.theme}
            onCycleTheme={cycleTheme}
            onOpen={() => {
              void fileManager.openFile()
            }}
            onOpenProject={() => {
              void projectDirectory.openProject()
            }}
            supportsOpenProject={projectDirectory.supportsDirectoryPicker}
            onSave={() => {
              void fileManager.saveFile()
            }}
            onSaveAs={() => {
              void fileManager.saveFileAs()
            }}
            onSettings={() => {
              setSettingsOpen(true)
            }}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            <WelcomeScreen
              recentFiles={recentFiles}
              onOpenFile={() => {
                void fileManager.openFile()
              }}
              onOpenProject={() => {
                void projectDirectory.openProject()
              }}
              supportsOpenProject={projectDirectory.supportsDirectoryPicker}
              onNewBlueprint={() => {
                setWizardOpen(true)
              }}
              onOpenRecent={handleOpenRecent}
              onLoadTemplate={handleCreate}
              isDark={resolvedTheme === 'dark'}
            />
          </div>
        </>
      ) : (
        <>
          <Header
            fileName={projectDirectory.projectName ?? fileManager.fileName ?? doc.name}
            dirty={fileManager.dirty}
            themeMode={settings.theme}
            onCycleTheme={cycleTheme}
            onOpen={() => {
              void fileManager.openFile()
            }}
            onOpenProject={() => {
              void projectDirectory.openProject()
            }}
            supportsOpenProject={projectDirectory.supportsDirectoryPicker}
            onSave={() => {
              void fileManager.saveFile()
            }}
            onSaveAs={() => {
              void fileManager.saveFileAs()
            }}
            onSettings={() => {
              setSettingsOpen(true)
            }}
            onSimulate={handleSimulate}
            isSimulating={simulation.isActive || showSimPanel}
            canSimulate={canSimulate}
            onClose={handleClose}
          />
          <div style={{ flex: 1, minHeight: 0 }}>
            <FlowprintEditor
              value={doc}
              onChange={handleChange}
              theme={settings.theme}
              symbolSearch={symbolSearch ?? undefined}
              rulesDataMap={rulesDataMap}
              nodeHighlights={simulation.nodeHighlights}
              showYamlPreview
              showExportButton
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          {showSimPanel && (
            <SimulationPanel
              simulation={{
                ...simulation,
                stop: () => {
                  simulation.stop()
                  setShowSimPanel(false)
                },
              }}
            />
          )}
        </>
      )}

      {error !== null && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            background: 'var(--fp-error, #f38ba8)',
            color: '#fff',
            borderRadius: 6,
            fontSize: 13,
            zIndex: 1000,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => {
              setError(null)
            }}
            style={{
              marginLeft: 12,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <NewBlueprintWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
        }}
        onCreate={handleCreate}
      />

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onSave={handleSettingsSave}
        onClose={() => {
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}
