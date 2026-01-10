import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import type { UseKeyboardShortcutsOptions } from './useKeyboardShortcuts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireKey(
  key: string,
  options?: {
    metaKey?: boolean
    ctrlKey?: boolean
    shiftKey?: boolean
    target?: EventTarget
  },
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
  if (options?.target) {
    Object.defineProperty(event, 'target', { value: options.target })
  }
  document.dispatchEvent(event)
  return event
}

function makeOptions(
  overrides?: Partial<UseKeyboardShortcutsOptions>,
): UseKeyboardShortcutsOptions {
  return {
    undo: vi.fn(),
    redo: vi.fn(),
    deleteSelected: vi.fn(),
    selectAll: vi.fn(),
    deselect: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useKeyboardShortcuts', () => {
  describe('undo', () => {
    it('Ctrl+Z calls undo (non-Mac)', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('z', { ctrlKey: true })

      expect(opts.undo).toHaveBeenCalledOnce()
      expect(opts.redo).not.toHaveBeenCalled()
    })

    it('Cmd+Z calls undo (Mac)', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'MacIntel' })
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('z', { metaKey: true })

      expect(opts.undo).toHaveBeenCalledOnce()
    })
  })

  describe('redo', () => {
    it('Ctrl+Shift+Z calls redo', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('z', { ctrlKey: true, shiftKey: true })

      expect(opts.redo).toHaveBeenCalledOnce()
      expect(opts.undo).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('Delete key calls deleteSelected', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('Delete')

      expect(opts.deleteSelected).toHaveBeenCalledOnce()
    })

    it('Backspace key calls deleteSelected', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('Backspace')

      expect(opts.deleteSelected).toHaveBeenCalledOnce()
    })
  })

  describe('deselect', () => {
    it('Escape calls deselect', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('Escape')

      expect(opts.deselect).toHaveBeenCalledOnce()
    })
  })

  describe('save', () => {
    it('Ctrl+S calls onSave and preventDefault', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
      const onSave = vi.fn()
      const opts = makeOptions({ onSave })
      renderHook(() => useKeyboardShortcuts(opts))

      const event = fireKey('s', { ctrlKey: true })

      expect(onSave).toHaveBeenCalledOnce()
      expect(event.defaultPrevented).toBe(true)
    })

    it('Ctrl+S does nothing when onSave not provided', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
      const opts = makeOptions({ onSave: undefined })
      renderHook(() => useKeyboardShortcuts(opts))

      // Should not throw
      const event = fireKey('s', { ctrlKey: true })

      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('editable element suppression', () => {
    it('shortcuts do not fire when target is an INPUT element', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      const input = document.createElement('input')
      fireKey('Delete', { target: input })

      expect(opts.deleteSelected).not.toHaveBeenCalled()
    })

    it('shortcuts do not fire when target is a TEXTAREA element', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      const textarea = document.createElement('textarea')
      fireKey('Escape', { target: textarea })

      expect(opts.deselect).not.toHaveBeenCalled()
    })

    it('shortcuts do not fire when target is a SELECT element', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      const select = document.createElement('select')
      fireKey('Backspace', { target: select })

      expect(opts.deleteSelected).not.toHaveBeenCalled()
    })

    it('shortcuts do not fire when target has contentEditable=true', () => {
      const opts = makeOptions()
      renderHook(() => useKeyboardShortcuts(opts))

      const div = document.createElement('div')
      div.contentEditable = 'true'
      fireKey('Delete', { target: div })

      expect(opts.deleteSelected).not.toHaveBeenCalled()
    })
  })

  describe('disabled', () => {
    it('shortcuts do not fire when disabled=true', () => {
      vi.stubGlobal('navigator', { ...navigator, platform: 'Win32' })
      const opts = makeOptions({ disabled: true })
      renderHook(() => useKeyboardShortcuts(opts))

      fireKey('z', { ctrlKey: true })
      fireKey('Delete')
      fireKey('Escape')

      expect(opts.undo).not.toHaveBeenCalled()
      expect(opts.deleteSelected).not.toHaveBeenCalled()
      expect(opts.deselect).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('unregisters listener on unmount', () => {
      const opts = makeOptions()
      const { unmount } = renderHook(() => useKeyboardShortcuts(opts))

      unmount()

      fireKey('Delete')
      fireKey('Escape')

      expect(opts.deleteSelected).not.toHaveBeenCalled()
      expect(opts.deselect).not.toHaveBeenCalled()
    })
  })
})
