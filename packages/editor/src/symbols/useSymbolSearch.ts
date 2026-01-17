import { useCallback, useEffect, useRef, useState } from 'react'
import type { SymbolSearchProvider } from './types'
import { CodeSearchProvider } from './CodeSearchProvider'
import { TreeSitterIndex } from './TreeSitterIndex'

// ---------------------------------------------------------------------------
// Public option / return types
// ---------------------------------------------------------------------------

/**
 * Options for the {@link useSymbolSearch} hook.
 */
export interface UseSymbolSearchOptions {
  /** URL to probe for a code-search server. If `undefined`, code-search is skipped. */
  codeSearchUrl?: string
  /** API key for authenticating with the code-search server. */
  codeSearchApiKey?: string
  /** Source files to index locally with tree-sitter. If `undefined`, tree-sitter is skipped. */
  files?: { path: string; content: string }[]
  /** Base URL for tree-sitter WASM parser and grammar files. */
  wasmPath?: string
}

/**
 * Return value of the {@link useSymbolSearch} hook.
 */
export interface UseSymbolSearchReturn {
  /** The active provider, or `null` if no provider could be initialized. */
  provider: SymbolSearchProvider | null
  /** Display name of the active provider (e.g. `"code-search"`), or `null`. */
  providerName: string | null
  /** Whether provider initialization is currently in progress. */
  loading: boolean
  /** Re-probe the code-search server and switch to it if healthy. */
  reconnect: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook that auto-detects and initializes the best available symbol search provider.
 *
 * Tries {@link CodeSearchProvider} first (higher priority, semantic search). If the
 * code-search server is unreachable, falls back to {@link TreeSitterIndex} when source
 * files are provided. Returns `null` if neither provider is available.
 *
 * @param options - Configuration for code-search URL, API key, and/or tree-sitter files.
 * @returns The active provider, loading state, and a reconnect function.
 *
 * @example
 * ```tsx
 * const { provider, loading } = useSymbolSearch({
 *   codeSearchUrl: 'http://localhost:8080',
 * })
 * ```
 */
export function useSymbolSearch(options: UseSymbolSearchOptions): UseSymbolSearchReturn {
  const [provider, setProvider] = useState<SymbolSearchProvider | null>(null)
  const [loading, setLoading] = useState(false)
  const cancelRef = useRef<boolean>(false)

  const initialize = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)

    // Try code-search first (higher priority — semantic search)
    if (options.codeSearchUrl) {
      const cs = new CodeSearchProvider({
        url: options.codeSearchUrl,
        apiKey: options.codeSearchApiKey,
      })
      const healthy = await cs.checkHealth()
      if (cancelRef.current as boolean) return
      if (healthy) {
        setProvider(cs)
        setLoading(false)
        return
      }
    }

    // Fall back to tree-sitter
    if (options.files && options.files.length > 0) {
      const ts = new TreeSitterIndex({ wasmPath: options.wasmPath })
      try {
        await ts.init(options.files)
        if (cancelRef.current as boolean) return
        setProvider(ts)
      } catch {
        if (cancelRef.current as boolean) return
        setProvider(null)
      }
    } else if (!(cancelRef.current as boolean)) {
      setProvider(null)
    }

    if (!(cancelRef.current as boolean)) {
      setLoading(false)
    }
  }, [options.codeSearchUrl, options.codeSearchApiKey, options.files, options.wasmPath])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void initialize()
    })
    return () => {
      cancelled = true
      cancelRef.current = true
    }
  }, [initialize])

  const reconnect = useCallback(async () => {
    if (!options.codeSearchUrl) return
    setLoading(true)
    const cs = new CodeSearchProvider({
      url: options.codeSearchUrl,
      apiKey: options.codeSearchApiKey,
    })
    const healthy = await cs.checkHealth()
    if (healthy) {
      setProvider(cs)
    }
    setLoading(false)
  }, [options.codeSearchUrl, options.codeSearchApiKey])

  return {
    provider,
    providerName: provider?.name ?? null,
    loading,
    reconnect,
  }
}
