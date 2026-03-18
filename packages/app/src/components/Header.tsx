import { useState } from 'react'
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
  onClose?: () => void
  saveDisabled?: boolean
}

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 11,
  border: '1px solid #2E2D3D',
  borderRadius: 10,
  background: '#1C1B25',
  color: '#E8E7F4',
  cursor: 'pointer',
}

function HeaderButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{
        ...btnStyle,
        background: hovered && !disabled ? '#252434' : '#1C1B25',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
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
  onClose,
  saveDisabled,
}: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
        borderBottom: 'none',
        background: 'rgba(10, 10, 15, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        color: '#E8E7F4',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onClose && (
          <HeaderButton onClick={onClose}>
            ←
          </HeaderButton>
        )}
        <strong style={{ fontSize: 14 }}>{fileName ?? 'Flowprint'}</strong>
        {fileName !== null && (
          <span
            style={{
              fontSize: 12,
              color: dirty ? '#f9e2af' : '#8887A5',
            }}
          >
            {dirty ? 'Unsaved changes' : 'Saved'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <HeaderButton onClick={onOpen}>Open</HeaderButton>
        {supportsOpenProject && onOpenProject && (
          <HeaderButton onClick={onOpenProject}>Open Project</HeaderButton>
        )}
        <HeaderButton onClick={onSave} disabled={saveDisabled}>Save</HeaderButton>
        <HeaderButton onClick={onSaveAs} disabled={saveDisabled}>Save As</HeaderButton>
        <HeaderButton onClick={onSettings}>Settings</HeaderButton>
        <HeaderButton onClick={onCycleTheme}>
          Theme: {THEME_LABELS[themeMode]}
        </HeaderButton>
      </div>
    </header>
  )
}
