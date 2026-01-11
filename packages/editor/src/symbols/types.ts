export interface SymbolResult {
  file: string
  symbol: string
  kind: 'function' | 'class' | 'method' | 'variable' | 'type' | 'interface'
  preview?: string // first line of the symbol's code
}

export interface SymbolDetail extends SymbolResult {
  startLine: number
  endLine: number
  signature?: string
}

export interface SymbolSearchProvider {
  /** Search for symbols matching a query string */
  search(query: string): Promise<SymbolResult[]>
  /** Resolve full details for a specific symbol */
  resolve(file: string, symbol: string): Promise<SymbolDetail | null>
  /** Display name of this provider (e.g. "tree-sitter", "code-search") */
  readonly name: string
  /** Whether this provider is ready to accept queries */
  readonly ready: boolean
}
