import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useKeyboardShortcuts } from '../useKeyboardShortcuts'

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }))
}

afterEach(() => {
  cleanup()
})

describe('useKeyboardShortcuts', () => {
  it('single key fires handler', () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: {
          v: { handler },
        },
      }),
    )

    fireKey('v')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('modifier combo works (mod+z fires on metaKey+z)', () => {
    const handler = vi.fn()

    // Mock navigator.platform to simulate Mac
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    })

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: {
          'mod+z': { handler },
        },
      }),
    )

    fireKey('z', { metaKey: true })
    expect(handler).toHaveBeenCalledOnce()

    // Restore original platform
    if (originalPlatform) {
      Object.defineProperty(navigator, 'platform', originalPlatform)
    } else {
      Object.defineProperty(navigator, 'platform', {
        value: '',
        configurable: true,
      })
    }
  })

  it('ignores when focus is in an input', () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: {
          v: { handler },
        },
      }),
    )

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    // Dispatch from the focused input
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }))

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('when predicate returning false prevents firing', () => {
    const handler = vi.fn()
    let enabled = false

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: {
          v: { handler, when: () => enabled },
        },
      }),
    )

    fireKey('v')
    expect(handler).not.toHaveBeenCalled()

    enabled = true
    fireKey('v')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('disabled option prevents all shortcuts', () => {
    const handler = vi.fn()

    renderHook(() =>
      useKeyboardShortcuts({
        shortcuts: {
          v: { handler },
        },
        disabled: true,
      }),
    )

    fireKey('v')
    expect(handler).not.toHaveBeenCalled()
  })
})
