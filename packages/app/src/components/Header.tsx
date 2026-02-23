import type { ThemeMode } from '@ruminaider/flowprint-editor'

export interface HeaderProps {
  fileName: string | null
  dirty: boolean
  themeMode: ThemeMode
  onCycleTheme: () => void
  onOpen: () => void
  onOpenProject?: () => void
  supportsOpenProject?: boolean
  onSave: () => void
  onSaveAs: () => void
  onSettings: () => void
}

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  border: '1px solid var(--fp-border, #e0e0e0)',
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
}

export function Header({
  fileName,
  dirty,
  themeMode,
  onCycleTheme,
  onOpen,
  onOpenProject,
  supportsOpenProject,
  onSave,
  onSaveAs,
  onSettings,
}: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        borderBottom: '1px solid var(--fp-border, #e0e0e0)',
        background: 'var(--fp-surface, #fff)',
        color: 'var(--fp-text, #1e1e2e)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <strong style={{ fontSize: 14 }}>{fileName ?? 'Flowprint'}</strong>
        {fileName !== null && (
          <span
            style={{
              fontSize: 12,
              color: dirty ? 'var(--fp-warning, #f9e2af)' : 'var(--fp-muted, #999)',
            }}
          >
            {dirty ? 'Unsaved changes' : 'Saved'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={onOpen} style={btnStyle}>
          Open
        </button>
        {supportsOpenProject && onOpenProject && (
          <button type="button" onClick={onOpenProject} style={btnStyle}>
            Open Project
          </button>
        )}
        <button type="button" onClick={onSave} style={btnStyle}>
          Save
        </button>
        <button type="button" onClick={onSaveAs} style={btnStyle}>
          Save As
        </button>
        <button type="button" onClick={onSettings} style={btnStyle}>
          Settings
        </button>
        <button type="button" onClick={onCycleTheme} style={btnStyle}>
          Theme: {THEME_LABELS[themeMode]}
        </button>
      </div>
    </header>
  )
}
