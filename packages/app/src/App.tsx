import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  FlowprintEditor,
  MigrationBanner,
  MigrationModal,
  useTheme,
  useSymbolSearch,
} from '@ruminaider/flowprint-editor'
import type { RulesDataMap } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isMajorBump } from '@ruminaider/flowprint-schema'
import { Header } from './components/Header'
import { WelcomeScreen } from './components/WelcomeScreen'
import { NewBlueprintWizard } from './components/NewBlueprintWizard'
import { SettingsDialog } from './components/SettingsDialog'
import { UnsavedChangesGuard } from './components/UnsavedChangesGuard'
import { useFileManager } from './hooks/useFileManager'
import { useProjectDirectory } from './hooks/useProjectDirectory'
import { useRecentFiles } from './hooks/useRecentFiles'
import { useSettings } from './hooks/useSettings'
import type { AppSettings } from './hooks/useSettings'
import type { RecentFile } from './hooks/useRecentFiles'

export function App() {
  const [doc, setDoc] = useState<FlowprintDocument | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rulesDataMap, setRulesDataMap] = useState<RulesDataMap>({})
  const [migrationAccepted, setMigrationAccepted] = useState(false)

  const settingsHook = useSettings()
  const { settings } = settingsHook
  const resolvedTheme = useTheme(settings.theme)
  const { recentFiles, addRecent } = useRecentFiles()

  const { provider: symbolSearch } = useSymbolSearch({
    codeSearchUrl: settings.codeSearchUrl || undefined,
  })

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

  // Use the migration result from whichever hook opened the file
  const activeMigrationResult =
    fileManager.migrationResult ?? projectDirectory.migrationResult ?? null
  const dismissMigration = useCallback(() => {
    fileManager.clearMigrationResult()
    projectDirectory.clearMigrationResult()
  }, [fileManager, projectDirectory])

  const needsMigrationModal = useMemo(() => {
    if (!activeMigrationResult || activeMigrationResult.status !== 'migrated') return false
    const hasRequiredOrNotable = activeMigrationResult.changelog.entries.some(
      (e) => e.required || e.notable,
    )
    const isMajor = isMajorBump(
      activeMigrationResult.fromVersion,
      activeMigrationResult.toVersion,
    )
    return hasRequiredOrNotable || isMajor
  }, [activeMigrationResult])

  const isForcedUpgrade = useMemo(() => {
    if (!activeMigrationResult || activeMigrationResult.status !== 'migrated') return false
    return isMajorBump(activeMigrationResult.fromVersion, activeMigrationResult.toVersion)
  }, [activeMigrationResult])

  useEffect(() => {
    setMigrationAccepted(false)
  }, [activeMigrationResult])

  const handleClose = useCallback(() => {
    if (fileManager.dirty) {
      if (!window.confirm('You have unsaved changes. Discard and return to the welcome screen?')) {
        return
      }
    }
    setDoc(null)
    fileManager.setDirty(false)
    setRulesDataMap({})
    setError(null)
    dismissMigration()
  }, [fileManager, dismissMigration])

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
            onClose={handleClose}
            saveDisabled={
              activeMigrationResult?.status === 'future_version' ||
              (needsMigrationModal && !migrationAccepted)
            }
          />
          {activeMigrationResult && activeMigrationResult.status !== 'current' && (
            <MigrationBanner result={activeMigrationResult} onDismiss={dismissMigration} />
          )}
          {needsMigrationModal && activeMigrationResult?.status === 'migrated' && (
            <MigrationModal
              open={!migrationAccepted}
              changelog={activeMigrationResult.changelog}
              forced={isForcedUpgrade}
              onAccept={() => setMigrationAccepted(true)}
            />
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <FlowprintEditor
              value={doc}
              onChange={handleChange}
              theme={settings.theme}
              symbolSearch={symbolSearch ?? undefined}
              rulesDataMap={rulesDataMap}
              readOnly={
                activeMigrationResult?.status === 'future_version' ||
                (needsMigrationModal && !migrationAccepted)
              }
              showYamlPreview
              showExportButton
              style={{ width: '100%', height: '100%' }}
            />
          </div>
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
