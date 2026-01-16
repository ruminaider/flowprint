import { useCallback, useEffect, useRef, useState } from 'react'
import type { SymbolSearchProvider } from './types'
import { CodeSearchProvider } from './CodeSearchProvider'
import { TreeSitterIndex } from './TreeSitterIndex'

// ---------------------------------------------------------------------------
// Public option / return types
// ---------------------------------------------------------------------------

export interface UseSymbolSearchOptions {
  /** URL to probe for code-search server (undefined = skip code-search) */
  codeSearchUrl?: string
  /** API key for code-search server */
  codeSearchApiKey?: string
  /** Files to index with tree-sitter (undefined = skip tree-sitter) */
  files?: { path: string; content: string }[]
  /** Base URL for tree-sitter WASM files */
  wasmPath?: string
}

export interface UseSymbolSearchReturn {
  /** The active provider, or null if none available */
  provider: SymbolSearchProvider | null
  /** Name of the active provider */
  providerName: string | null
  /** Whether provider initialization is in progress */
  loading: boolean
  /** Re-probe code-search server */
  reconnect: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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
