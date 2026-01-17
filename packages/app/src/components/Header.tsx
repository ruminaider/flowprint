import type { ThemeMode } from '@ruminaider/flowprint-editor'

export interface HeaderProps {
  fileName: string
  dirty: boolean
  themeMode: ThemeMode
  onCycleTheme: () => void
}

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

export function Header({ fileName, dirty, themeMode, onCycleTheme }: HeaderProps) {
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
        <strong style={{ fontSize: 14 }}>{fileName}</strong>
        <span
          style={{
            fontSize: 12,
            color: dirty ? 'var(--fp-warning, #f9e2af)' : 'var(--fp-muted, #999)',
          }}
        >
          {dirty ? 'Unsaved changes' : 'Saved'}
        </span>
      </div>
      <button
        type="button"
        onClick={onCycleTheme}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          border: '1px solid var(--fp-border, #e0e0e0)',
          borderRadius: 4,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        Theme: {THEME_LABELS[themeMode]}
      </button>
    </header>
  )
}
