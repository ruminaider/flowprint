import type { SymbolResult, SymbolDetail, SymbolSearchProvider } from './types'

// ---------------------------------------------------------------------------
// Public option types
// ---------------------------------------------------------------------------

/**
 * Configuration options for {@link TreeSitterIndex}.
 */
export interface TreeSitterIndexOptions {
  /** Base URL for loading WASM files (grammars + parser). Defaults to `'/tree-sitter/'`. */
  wasmPath?: string
  /** Languages to support. Defaults to `['typescript', 'javascript', 'python']`. */
  languages?: string[]
}

/**
 * A source file to be indexed by {@link TreeSitterIndex}.
 */
export interface FileInput {
  /** Relative path of the file (e.g. `'src/api.ts'`) */
  path: string
  /** Full text content of the file */
  content: string
}

// ---------------------------------------------------------------------------
// Internal indexed symbol storage
// ---------------------------------------------------------------------------

interface IndexedSymbol {
  file: string
  symbol: string
  kind: SymbolResult['kind']
  preview: string
  startLine: number
  endLine: number
  signature: string
}

// ---------------------------------------------------------------------------
// Minimal tree-sitter node type for internal use
// ---------------------------------------------------------------------------

interface TreeSitterNode {
  type: string
  text: string
  childCount: number
  startPosition: { row: number; column: number }
  endPosition: { row: number; column: number }
  child(index: number): TreeSitterNode | null
  childForFieldName?(name: string): TreeSitterNode | null
}

// ---------------------------------------------------------------------------
// TreeSitterIndex
// ---------------------------------------------------------------------------

/** Maximum number of search results returned by `search()`. */
const SEARCH_LIMIT = 50

/**
 * Browser-side symbol search provider backed by tree-sitter WASM grammars.
 *
 * Parses source files in-browser and indexes all function, class, method, variable,
 * type, and interface declarations. Requires `web-tree-sitter` as an optional peer
 * dependency and WASM grammar files served from a configurable base URL.
 *
 * @example
 * ```ts
 * const index = new TreeSitterIndex({ wasmPath: '/tree-sitter/' })
 * await index.init([{ path: 'src/api.ts', content: sourceCode }])
 * const results = await index.search('handleRequest')
 * ```
 */
export class TreeSitterIndex implements SymbolSearchProvider {
  readonly name = 'tree-sitter'

  private _initialized = false
  private _symbols: IndexedSymbol[] = []
  private readonly _wasmPath: string
  private readonly _languages: string[]

  /** Whether the index has been initialized and is ready to accept queries. */
  get ready(): boolean {
    return this._initialized
  }

  /**
   * Create a new TreeSitterIndex.
   *
   * @param options - Configuration for WASM paths and language support.
   */
  constructor(options: TreeSitterIndexOptions = {}) {
    this._wasmPath = options.wasmPath ?? '/tree-sitter/'
    this._languages = options.languages ?? ['typescript', 'javascript', 'python']
  }

  // ---- public API ----------------------------------------------------------

  /**
   * Initialize the index by parsing provided files.
   * Loads WASM parser and grammars lazily on first call.
   */
  async init(files: FileInput[]): Promise<void> {
    // Dynamic import web-tree-sitter — not a declared dependency.
    // If the package is not installed the import will throw, leaving
    // `_initialized` as false so `ready` stays false.
    //
    // The module specifier is assigned to a variable so bundlers (Vite/Rollup)
    // do not try to resolve it at build time.
    const moduleId = 'web-tree-sitter'
    const TreeSitter = (await import(/* @vite-ignore */ moduleId)) as {
      default: {
        init(opts: { locateFile: (name: string) => string }): Promise<void>
        Language: { load(path: string): Promise<unknown> }
        new (): {
          setLanguage(lang: unknown): void
          parse(input: string): { rootNode: unknown }
        }
      }
    }
    await TreeSitter.default.init({
      locateFile: (scriptName: string) => `${this._wasmPath}${scriptName}`,
    })

    const parser = new TreeSitter.default()

    for (const file of files) {
      const lang = this._detectLanguage(file.path)
      if (!lang || !this._languages.includes(lang)) continue

      try {
        const grammar = await TreeSitter.default.Language.load(
          `${this._wasmPath}tree-sitter-${lang}.wasm`,
        )
        parser.setLanguage(grammar)
        const tree = parser.parse(file.content)
        const symbols = this._extractSymbols(tree.rootNode, file.path, file.content)
        this._symbols.push(...symbols)
      } catch {
        // Skip files whose grammar fails to load
        continue
      }
    }

    this._initialized = true
  }

  /**
   * Search indexed symbols by name substring match.
   *
   * Results are sorted by match position (prefix matches first) and limited
   * to 50 results. Returns an empty array if the index has not been initialized.
   *
   * @param query - Search string to match against symbol names (case-insensitive).
   */
  search(query: string): Promise<SymbolResult[]> {
    if (!this._initialized) return Promise.resolve([])
    const lower = query.toLowerCase()

    return Promise.resolve(
      this._symbols
        .filter((s) => s.symbol.toLowerCase().includes(lower))
        .sort((a, b) => {
          // Exact prefix match first, then by position in name
          const aIdx = a.symbol.toLowerCase().indexOf(lower)
          const bIdx = b.symbol.toLowerCase().indexOf(lower)
          return aIdx - bIdx
        })
        .slice(0, SEARCH_LIMIT)
        .map((s) => ({
          file: s.file,
          symbol: s.symbol,
          kind: s.kind,
          preview: s.preview,
        })),
    )
  }

  /**
   * Resolve full details for a symbol by file path and name.
   *
   * @param file - File path to look up.
   * @param symbol - Symbol name to find in that file.
   * @returns Full symbol details including line range and signature, or `null` if not found.
   */
  resolve(file: string, symbol: string): Promise<SymbolDetail | null> {
    const found = this._symbols.find((s) => s.file === file && s.symbol === symbol)
    if (!found) return Promise.resolve(null)
    return Promise.resolve({
      file: found.file,
      symbol: found.symbol,
      kind: found.kind,
      preview: found.preview,
      startLine: found.startLine,
      endLine: found.endLine,
      signature: found.signature,
    })
  }

  // ---- private helpers -----------------------------------------------------

  /** Map file extension to language identifier. */
  _detectLanguage(path: string): string | null {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript'
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript'
    if (path.endsWith('.py')) return 'python'
    return null
  }

  private _extractSymbols(
    rootNode: unknown,
    filePath: string,
    content: string,
  ): IndexedSymbol[] {
    const symbols: IndexedSymbol[] = []
    const lines = content.split('\n')
    this._walkNode(rootNode as TreeSitterNode, filePath, lines, symbols)
    return symbols
  }

  private _walkNode(
    node: TreeSitterNode,
    filePath: string,
    lines: string[],
    symbols: IndexedSymbol[],
  ): void {
    const type = node.type

    if (this._isSymbolDeclaration(type)) {
      const nameNode = node.childForFieldName?.('name')
      if (nameNode) {
        const symbolName = nameNode.text
        const startLine = node.startPosition.row + 1
        const endLine = node.endPosition.row + 1
        const preview = lines[node.startPosition.row] ?? ''

        symbols.push({
          file: filePath,
          symbol: symbolName,
          kind: this._nodeTypeToKind(type),
          preview: preview.trim(),
          startLine,
          endLine,
          signature: preview.trim(),
        })
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i)
      if (child) {
        this._walkNode(child, filePath, lines, symbols)
      }
    }
  }

  private _isSymbolDeclaration(type: string): boolean {
    return [
      'function_declaration',
      'function_definition', // Python
      'class_declaration',
      'class_definition', // Python
      'method_definition',
      'variable_declarator',
      'lexical_declaration',
      'type_alias_declaration',
      'interface_declaration',
      'export_statement',
    ].includes(type)
  }

  private _nodeTypeToKind(type: string): SymbolResult['kind'] {
    switch (type) {
      case 'function_declaration':
      case 'function_definition':
        return 'function'
      case 'class_declaration':
      case 'class_definition':
        return 'class'
      case 'method_definition':
        return 'method'
      case 'type_alias_declaration':
        return 'type'
      case 'interface_declaration':
        return 'interface'
      default:
        return 'variable'
    }
  }
}
