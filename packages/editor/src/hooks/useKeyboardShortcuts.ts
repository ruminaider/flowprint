import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseKeyboardShortcutsOptions {
  undo: () => void
  redo: () => void
  deleteSelected: () => void
  selectAll: () => void
  onSave?: () => void
  deselect: () => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the event target is an editable element (input, textarea,
 * select, or contentEditable). Shortcuts should not fire while the user is
 * typing in a form field.
 */
function isEditableTarget(event: KeyboardEvent): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.contentEditable === 'true') return true
  return false
}

/**
 * Returns true when the platform modifier key is pressed (Cmd on macOS,
 * Ctrl on Windows/Linux).
 */
function hasMod(event: KeyboardEvent): boolean {
  const isMac = navigator.platform.includes('Mac')
  return isMac ? event.metaKey : event.ctrlKey
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    undo,
    redo,
    deleteSelected,
    onSave,
    deselect,
    disabled,
  } = options

  useEffect(() => {
    if (disabled) return

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event)) return

      // Mod+Shift+Z → redo (must be checked before Mod+Z)
      if (hasMod(event) && event.shiftKey && event.key === 'z') {
        event.preventDefault()
        redo()
        return
      }

      // Mod+Z → undo
      if (hasMod(event) && !event.shiftKey && event.key === 'z') {
        event.preventDefault()
        undo()
        return
      }

      // Mod+S → save
      if (hasMod(event) && event.key === 's') {
        event.preventDefault()
        onSave?.()
        return
      }

      // Delete / Backspace → delete selected
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
        return
      }

      // Escape → deselect
      if (event.key === 'Escape') {
        event.preventDefault()
        deselect()
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo, deleteSelected, onSave, deselect, disabled])
}
