import type { SymbolResult, SymbolDetail, SymbolSearchProvider } from './types'

/**
 * Configuration options for {@link CodeSearchProvider}.
 */
export interface CodeSearchProviderOptions {
  /** Base URL of the code-search server (e.g. `"http://localhost:8080"`). Trailing slashes are stripped. */
  url: string
  /** Optional API key sent as a `Bearer` token in the `Authorization` header. */
  apiKey?: string
}

/**
 * Symbol search provider that delegates to a remote code-search REST API.
 *
 * Connects to a running [code-search](https://github.com/ruminaider/code-search) server
 * and provides semantic symbol search. Call {@link checkHealth} after construction to
 * verify the server is reachable before using search/resolve.
 *
 * @example
 * ```ts
 * const provider = new CodeSearchProvider({ url: 'http://localhost:8080' })
 * await provider.checkHealth()
 * if (provider.ready) {
 *   const results = await provider.search('handleRequest')
 * }
 * ```
 */
export class CodeSearchProvider implements SymbolSearchProvider {
  readonly name = 'code-search'

  private _healthy = false
  private readonly _url: string
  private readonly _apiKey?: string

  /** Whether the server health check passed and the provider is ready for queries. */
  get ready(): boolean {
    return this._healthy
  }

  /**
   * Create a new CodeSearchProvider.
   *
   * @param options - Server URL and optional authentication.
   */
  constructor(options: CodeSearchProviderOptions) {
    this._url = options.url.replace(/\/$/, '') // strip trailing slash
    this._apiKey = options.apiKey
  }

  /** Probe health endpoint, returns true if server is reachable */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this._url}/health`, {
        headers: this._headers(),
        signal: AbortSignal.timeout(3000),
      })
      this._healthy = res.ok
      return this._healthy
    } catch {
      this._healthy = false
      return false
    }
  }

  /**
   * Search for symbols matching a query via the `/api/search` endpoint.
   *
   * Returns an empty array if the server is not healthy or the request fails.
   *
   * @param query - Search string to send to the server.
   */
  async search(query: string): Promise<SymbolResult[]> {
    if (!this._healthy) return []
    try {
      const res = await fetch(`${this._url}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this._headers(),
        },
        body: JSON.stringify({ query, limit: 50 }),
      })
      if (!res.ok) return []

      const data: unknown = await res.json()
      return this._parseSearchResults(data)
    } catch {
      return []
    }
  }

  /**
   * Resolve full symbol details via the `/api/resolve` endpoint.
   *
   * @param file - File path to look up.
   * @param symbol - Symbol name to resolve.
   * @returns Full symbol details, or `null` if not found or server is unhealthy.
   */
  async resolve(file: string, symbol: string): Promise<SymbolDetail | null> {
    if (!this._healthy) return null
    try {
      const res = await fetch(`${this._url}/api/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this._headers(),
        },
        body: JSON.stringify({ file, symbol }),
      })
      if (!res.ok) return null

      const data: unknown = await res.json()
      return this._parseResolveResult(data)
    } catch {
      return null
    }
  }

  private _headers(): Record<string, string> {
    if (this._apiKey) {
      return { Authorization: `Bearer ${this._apiKey}` }
    }
    return {}
  }

  private _parseSearchResults(data: unknown): SymbolResult[] {
    if (!data || typeof data !== 'object' || !('results' in data)) return []
    const obj = data as { results: unknown }
    if (!Array.isArray(obj.results)) return []

    return obj.results
      .filter(
        (r: unknown): r is Record<string, unknown> =>
          r !== null && typeof r === 'object' && 'file' in r && 'symbol' in r,
      )
      .map((r) => ({
        file: typeof r.file === 'string' ? r.file : '',
        symbol: typeof r.symbol === 'string' ? r.symbol : '',
        kind: this._parseKind(r.kind),
        ...(r.preview ? { preview: typeof r.preview === 'string' ? r.preview : '' } : {}),
      }))
  }

  private _parseResolveResult(data: unknown): SymbolDetail | null {
    if (!data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    if (!d.file || !d.symbol) return null

    return {
      file: typeof d.file === 'string' ? d.file : '',
      symbol: typeof d.symbol === 'string' ? d.symbol : '',
      kind: this._parseKind(d.kind),
      startLine: typeof d.startLine === 'number' ? d.startLine : 0,
      endLine: typeof d.endLine === 'number' ? d.endLine : 0,
      ...(d.preview ? { preview: typeof d.preview === 'string' ? d.preview : '' } : {}),
      ...(d.signature ? { signature: typeof d.signature === 'string' ? d.signature : '' } : {}),
    }
  }

  private _parseKind(kind: unknown): SymbolResult['kind'] {
    const validKinds: SymbolResult['kind'][] = [
      'function',
      'class',
      'method',
      'variable',
      'type',
      'interface',
    ]
    if (typeof kind === 'string' && validKinds.includes(kind as SymbolResult['kind'])) {
      return kind as SymbolResult['kind']
    }
    return 'function'
  }
}
