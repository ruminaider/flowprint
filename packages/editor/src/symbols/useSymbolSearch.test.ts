import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSymbolSearch } from './useSymbolSearch'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

interface MockCodeSearchProto {
  name: string
  ready: boolean
  checkHealth: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  resolve: ReturnType<typeof vi.fn>
}

interface MockTreeSitterProto {
  name: string
  ready: boolean
  init: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  resolve: ReturnType<typeof vi.fn>
}

vi.mock('./CodeSearchProvider', () => {
  const MockCodeSearchProvider = vi.fn() as ReturnType<typeof vi.fn> & {
    prototype: MockCodeSearchProto
  }
  MockCodeSearchProvider.prototype.name = 'code-search'
  MockCodeSearchProvider.prototype.ready = false
  MockCodeSearchProvider.prototype.checkHealth = vi.fn().mockResolvedValue(false)
  MockCodeSearchProvider.prototype.search = vi.fn().mockResolvedValue([])
  MockCodeSearchProvider.prototype.resolve = vi.fn().mockResolvedValue(null)
  return { CodeSearchProvider: MockCodeSearchProvider }
})

vi.mock('./TreeSitterIndex', () => {
  const MockTreeSitterIndex = vi.fn() as ReturnType<typeof vi.fn> & {
    prototype: MockTreeSitterProto
  }
  MockTreeSitterIndex.prototype.name = 'tree-sitter'
  MockTreeSitterIndex.prototype.ready = false
  MockTreeSitterIndex.prototype.init = vi.fn().mockResolvedValue(undefined)
  MockTreeSitterIndex.prototype.search = vi.fn().mockResolvedValue([])
  MockTreeSitterIndex.prototype.resolve = vi.fn().mockResolvedValue(null)
  return { TreeSitterIndex: MockTreeSitterIndex }
})

// Import after mocks are set up
const { CodeSearchProvider } = await import('./CodeSearchProvider')
const { TreeSitterIndex } = await import('./TreeSitterIndex')

// Typed prototype references for mock helpers
const csProto = CodeSearchProvider.prototype as unknown as MockCodeSearchProto
const tsProto = TreeSitterIndex.prototype as unknown as MockTreeSitterProto

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockCodeSearchHealthy(healthy: boolean) {
  csProto.checkHealth.mockResolvedValue(healthy)
}

function mockTreeSitterInitSuccess() {
  tsProto.init.mockResolvedValue(undefined)
}

function mockTreeSitterInitFailure() {
  tsProto.init.mockRejectedValue(new Error('WASM load failed'))
}

const TEST_FILES = [{ path: 'src/main.ts', content: 'function main() {}' }]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockCodeSearchHealthy(false)
  mockTreeSitterInitSuccess()
})

describe('useSymbolSearch', () => {
  // ---- Code-search available -----------------------------------------------

  it('uses CodeSearchProvider when code-search is healthy', async () => {
    mockCodeSearchHealthy(true)

    const { result } = renderHook(() =>
      useSymbolSearch({ codeSearchUrl: 'http://localhost:8080' }),
    )

    await waitFor(() => {
      expect(result.current.providerName).toBe('code-search')
    })

    expect(result.current.provider).not.toBeNull()
    expect(result.current.loading).toBe(false)
  })

  // ---- Code-search unavailable, files provided → tree-sitter ---------------

  it('falls back to TreeSitterIndex when code-search is unhealthy', async () => {
    mockCodeSearchHealthy(false)
    mockTreeSitterInitSuccess()

    const { result } = renderHook(() =>
      useSymbolSearch({
        codeSearchUrl: 'http://localhost:8080',
        files: TEST_FILES,
      }),
    )

    await waitFor(() => {
      expect(result.current.providerName).toBe('tree-sitter')
    })

    expect(result.current.provider).not.toBeNull()
    expect(result.current.loading).toBe(false)
  })

  // ---- Both unavailable → null ---------------------------------------------

  it('returns null provider when both are unavailable', async () => {
    mockCodeSearchHealthy(false)
    mockTreeSitterInitFailure()

    const { result } = renderHook(() =>
      useSymbolSearch({
        codeSearchUrl: 'http://localhost:8080',
        files: TEST_FILES,
      }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.provider).toBeNull()
    expect(result.current.providerName).toBeNull()
  })

  // ---- No options → null, not loading --------------------------------------

  it('returns null provider when no options are provided', async () => {
    const { result } = renderHook(() => useSymbolSearch({}))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.provider).toBeNull()
    expect(result.current.providerName).toBeNull()
  })

  // ---- Loading state -------------------------------------------------------

  it('starts loading and finishes after initialization', async () => {
    // Make checkHealth take time by using a delayed promise
    let resolveHealth!: (value: boolean) => void
    csProto.checkHealth.mockReturnValue(
      new Promise((resolve) => {
        resolveHealth = resolve
      }),
    )

    const { result } = renderHook(() =>
      useSymbolSearch({ codeSearchUrl: 'http://localhost:8080' }),
    )

    // Should be loading while checkHealth is pending (after microtask runs)
    await waitFor(() => {
      expect(result.current.loading).toBe(true)
    })

    // Resolve the health check
    await act(async () => {
      resolveHealth(true)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  // ---- reconnect: code-search becomes available ----------------------------

  it('reconnect switches to code-search when it becomes available', async () => {
    mockCodeSearchHealthy(false)
    mockTreeSitterInitSuccess()

    const { result } = renderHook(() =>
      useSymbolSearch({
        codeSearchUrl: 'http://localhost:8080',
        files: TEST_FILES,
      }),
    )

    // Wait for initial fallback to tree-sitter
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.providerName).toBe('tree-sitter')

    // Now make code-search healthy and reconnect
    mockCodeSearchHealthy(true)

    await act(async () => {
      await result.current.reconnect()
    })

    expect(result.current.providerName).toBe('code-search')
    expect(result.current.loading).toBe(false)
  })

  // ---- reconnect: code-search still down -----------------------------------

  it('reconnect keeps current provider when code-search is still down', async () => {
    mockCodeSearchHealthy(false)
    mockTreeSitterInitSuccess()

    const { result } = renderHook(() =>
      useSymbolSearch({
        codeSearchUrl: 'http://localhost:8080',
        files: TEST_FILES,
      }),
    )

    await waitFor(() => {
      expect(result.current.providerName).toBe('tree-sitter')
    })

    // Code-search still down
    mockCodeSearchHealthy(false)

    await act(async () => {
      await result.current.reconnect()
    })

    // Should keep tree-sitter provider
    expect(result.current.providerName).toBe('tree-sitter')
    expect(result.current.loading).toBe(false)
  })

  // ---- Effect cleanup: cancels on unmount ----------------------------------

  it('does not update state after unmount', async () => {
    // Make checkHealth take time so we can unmount during it
    let resolveHealth!: (value: boolean) => void
    csProto.checkHealth.mockReturnValue(
      new Promise((resolve) => {
        resolveHealth = resolve
      }),
    )

    const { result, unmount } = renderHook(() =>
      useSymbolSearch({ codeSearchUrl: 'http://localhost:8080' }),
    )

    // Wait for microtask to start initialization
    await waitFor(() => {
      expect(result.current.loading).toBe(true)
    })

    // Unmount before health check resolves
    unmount()

    // Resolve health check after unmount — should not cause state updates
    await act(async () => {
      resolveHealth(true)
      await Promise.resolve()
    })

    // Provider should still be null since the effect was cancelled
    expect(result.current.provider).toBeNull()
  })

  // ---- reconnect is a no-op without codeSearchUrl --------------------------

  it('reconnect is a no-op when codeSearchUrl is not provided', async () => {
    const { result } = renderHook(() => useSymbolSearch({ files: TEST_FILES }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.reconnect()
    })

    // checkHealth should not have been called since there is no codeSearchUrl
    expect(csProto.checkHealth).not.toHaveBeenCalled()
  })

  // ---- Tree-sitter only (no code-search URL) --------------------------------

  it('uses tree-sitter when only files are provided', async () => {
    mockTreeSitterInitSuccess()

    const { result } = renderHook(() => useSymbolSearch({ files: TEST_FILES }))

    await waitFor(() => {
      expect(result.current.providerName).toBe('tree-sitter')
    })

    expect(result.current.loading).toBe(false)
  })
})
