import { useEffect } from 'react'

interface ShortcutConfig {
  handler: () => void
  when?: () => boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Record<string, ShortcutConfig>
  disabled?: boolean
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (target.isContentEditable) return true
  return false
}

interface ParsedShortcut {
  mod: boolean
  shift: boolean
  alt: boolean
  key: string
}

function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split('+')
  const result: ParsedShortcut = {
    mod: false,
    shift: false,
    alt: false,
    key: '',
  }

  for (const part of parts) {
    if (part === 'mod') {
      result.mod = true
    } else if (part === 'shift') {
      result.shift = true
    } else if (part === 'alt') {
      result.alt = true
    } else {
      result.key = part
    }
  }

  return result
}

function matchesShortcut(event: KeyboardEvent, parsed: ParsedShortcut): boolean {
  const mac = isMac()
  const modPressed = mac ? event.metaKey : event.ctrlKey

  if (parsed.mod !== modPressed) return false
  if (parsed.shift !== event.shiftKey) return false
  if (parsed.alt !== event.altKey) return false

  return event.key.toLowerCase() === parsed.key
}

export function useKeyboardShortcuts({ shortcuts, disabled }: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    if (disabled) return

    const parsedEntries = Object.entries(shortcuts).map(([shortcutStr, config]) => ({
      parsed: parseShortcut(shortcutStr),
      config,
    }))

    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      for (const { parsed, config } of parsedEntries) {
        if (matchesShortcut(event, parsed)) {
          if (config.when && !config.when()) continue
          event.preventDefault()
          config.handler()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, disabled])
}
