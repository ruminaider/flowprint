/**
 * A code symbol returned from a search query.
 *
 * Represents a named symbol (function, class, method, etc.) found in a source file.
 * Used by the entry point picker to let users link action nodes to code.
 */
export interface SymbolResult {
  /** Relative file path where the symbol is defined */
  file: string
  /** Name of the symbol (e.g. `"handleRequest"`) */
  symbol: string
  /** Category of the symbol declaration */
  kind: 'function' | 'class' | 'method' | 'variable' | 'type' | 'interface'
  /** First line of the symbol's source code, used as a preview in search results */
  preview?: string
}

/**
 * Extended symbol information returned by `resolve()`.
 *
 * Includes source location and optional signature, enabling precise code navigation.
 */
export interface SymbolDetail extends SymbolResult {
  /** 1-based line number where the symbol declaration starts */
  startLine: number
  /** 1-based line number where the symbol declaration ends */
  endLine: number
  /** Full function/method signature, if available */
  signature?: string
}

/**
 * Interface for pluggable code symbol search backends.
 *
 * Implement this interface to integrate a custom code search provider with the
 * Flowprint editor's entry point picker. Two built-in implementations are provided:
 *
 * - {@link TreeSitterIndex} -- WASM-based, runs in the browser
 * - {@link CodeSearchProvider} -- REST API client for the code-search server
 *
 * @example
 * ```ts
 * class MyProvider implements SymbolSearchProvider {
 *   readonly name = 'my-provider'
 *   readonly ready = true
 *   async search(query: string) { ... }
 *   async resolve(file: string, symbol: string) { ... }
 * }
 * ```
 */
export interface SymbolSearchProvider {
  /** Search for symbols matching a query string. Returns up to 50 results. */
  search(query: string): Promise<SymbolResult[]>
  /** Resolve full details (line range, signature) for a specific symbol in a file. */
  resolve(file: string, symbol: string): Promise<SymbolDetail | null>
  /** Display name of this provider (e.g. `"tree-sitter"`, `"code-search"`). */
  readonly name: string
  /** Whether this provider has been initialized and is ready to accept queries. */
  readonly ready: boolean
}
