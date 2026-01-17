import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'
import type { ThemeMode } from './useTheme'

// ---------------------------------------------------------------------------
// matchMedia mock
// ---------------------------------------------------------------------------

interface MockMediaQueryList {
  matches: boolean
  media: string
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  dispatchEvent: ReturnType<typeof vi.fn>
  onchange: null
  addListener: ReturnType<typeof vi.fn>
  removeListener: ReturnType<typeof vi.fn>
}

let mockMql: MockMediaQueryList

function createMockMql(matches: boolean): MockMediaQueryList {
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }
}

beforeEach(() => {
  mockMql = createMockMql(false)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mockMql),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTheme', () => {
  it('returns "light" when mode is "light"', () => {
    const { result } = renderHook(() => useTheme('light'))
    expect(result.current).toBe('light')
  })

  it('returns "dark" when mode is "dark"', () => {
    const { result } = renderHook(() => useTheme('dark'))
    expect(result.current).toBe('dark')
  })

  it('returns "light" in system mode when OS prefers light', () => {
    mockMql = createMockMql(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMql),
    )

    const { result } = renderHook(() => useTheme('system'))
    expect(result.current).toBe('light')
  })

  it('returns "dark" in system mode when OS prefers dark', () => {
    mockMql = createMockMql(true)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMql),
    )

    const { result } = renderHook(() => useTheme('system'))
    expect(result.current).toBe('dark')
  })

  it('re-renders when mode changes from "light" to "dark"', () => {
    const { result, rerender } = renderHook(({ mode }: { mode: ThemeMode }) => useTheme(mode), {
      initialProps: { mode: 'light' as ThemeMode },
    })

    expect(result.current).toBe('light')

    rerender({ mode: 'dark' })
    expect(result.current).toBe('dark')
  })

  it('responds to live OS theme changes in system mode', () => {
    mockMql = createMockMql(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMql),
    )

    const { result } = renderHook(() => useTheme('system'))
    expect(result.current).toBe('light')

    // Capture the handler registered via addEventListener
    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    const calls = mockMql.addEventListener.mock.calls[0] as
      | [string, (e: MediaQueryListEvent) => void]
      | undefined
    const handler = calls?.[1]
    expect(handler).toBeDefined()

    // Simulate OS switching to dark mode
    act(() => {
      handler?.({ matches: true } as MediaQueryListEvent)
    })
    expect(result.current).toBe('dark')

    // Simulate OS switching back to light mode
    act(() => {
      handler?.({ matches: false } as MediaQueryListEvent)
    })
    expect(result.current).toBe('light')
  })

  it('cleans up event listener on unmount', () => {
    mockMql = createMockMql(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMql),
    )

    const { unmount } = renderHook(() => useTheme('system'))

    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    const calls = mockMql.addEventListener.mock.calls[0] as
      | [string, (e: MediaQueryListEvent) => void]
      | undefined
    const handler = calls?.[1]

    unmount()

    expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', handler)
  })

  it('cleans up event listener when mode changes away from "system"', () => {
    mockMql = createMockMql(false)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMql),
    )

    const { rerender } = renderHook(({ mode }: { mode: ThemeMode }) => useTheme(mode), {
      initialProps: { mode: 'system' as ThemeMode },
    })

    expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    const calls = mockMql.addEventListener.mock.calls[0] as
      | [string, (e: MediaQueryListEvent) => void]
      | undefined
    const handler = calls?.[1]

    rerender({ mode: 'light' })

    expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', handler)
  })

  it('does not subscribe to matchMedia when mode is not "system"', () => {
    renderHook(() => useTheme('dark'))
    expect(mockMql.addEventListener).not.toHaveBeenCalled()
  })
})
