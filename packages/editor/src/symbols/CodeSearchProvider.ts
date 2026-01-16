import type { SymbolResult, SymbolDetail, SymbolSearchProvider } from './types'

export interface CodeSearchProviderOptions {
  /** Base URL of code-search server (e.g., "http://localhost:8080") */
  url: string
  /** Optional API key for authentication */
  apiKey?: string
}

export class CodeSearchProvider implements SymbolSearchProvider {
  readonly name = 'code-search'

  private _healthy = false
  private readonly _url: string
  private readonly _apiKey?: string

  get ready(): boolean {
    return this._healthy
  }

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
