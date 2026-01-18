import { useState, useEffect, useRef, useCallback } from 'react'
import type { AppSettings } from '../hooks/useSettings'
import type { ThemeMode } from '@ruminaider/flowprint-editor'

export interface SettingsDialogProps {
  open: boolean
  settings: AppSettings
  onSave: (settings: AppSettings) => void
  onClose: () => void
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsDialog({ open, settings, onSave, onClose }: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [repoRoot, setRepoRoot] = useState(settings.repoRoot)
  const [codeSearchUrl, setCodeSearchUrl] = useState(settings.codeSearchUrl)
  const [theme, setTheme] = useState<ThemeMode>(settings.theme)

  // Reset local form state when dialog opens
  // Using a separate counter state to track open transitions
  const [openCount, setOpenCount] = useState(0)

  useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1)
    }
  }, [open])

  useEffect(() => {
    if (openCount === 0) return
    setRepoRoot(settings.repoRoot)
    setCodeSearchUrl(settings.codeSearchUrl)
    setTheme(settings.theme)
    // Only reset when openCount changes (i.e., dialog opens)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount])

  // Control dialog open/close via ref
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  const handleSave = useCallback(() => {
    onSave({ repoRoot, codeSearchUrl, theme })
  }, [repoRoot, codeSearchUrl, theme, onSave])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <dialog ref={dialogRef} onCancel={onClose}>
      <h2>Settings</h2>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fp-settings-repo-root">Repository root</label>
        <br />
        <input
          id="fp-settings-repo-root"
          type="text"
          value={repoRoot}
          onChange={(e) => {
            setRepoRoot(e.target.value)
          }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fp-settings-code-search-url">Code-search URL</label>
        <br />
        <input
          id="fp-settings-code-search-url"
          type="text"
          value={codeSearchUrl}
          onChange={(e) => {
            setCodeSearchUrl(e.target.value)
          }}
          placeholder="http://localhost:8080"
          style={{ width: '100%' }}
        />
      </div>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>Theme</legend>
        {THEME_OPTIONS.map((opt) => (
          <label key={opt.value} style={{ marginRight: 12 }}>
            <input
              type="radio"
              name="theme"
              value={opt.value}
              checked={theme === opt.value}
              onChange={() => {
                setTheme(opt.value)
              }}
            />{' '}
            {opt.label}
          </label>
        ))}
      </fieldset>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" onClick={handleSave}>
          Save
        </button>
      </div>
    </dialog>
  )
}
