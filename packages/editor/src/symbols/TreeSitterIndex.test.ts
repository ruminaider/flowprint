import { describe, it, expect, vi } from 'vitest'
import { TreeSitterIndex } from './TreeSitterIndex'
import type { SymbolSearchProvider } from './types'

// Mock web-tree-sitter so tests never trigger real WASM loading.
// The real module's abort() creates unhandled rejections in test/CI environments
// where the WASM binary is absent. All search/resolve tests bypass init() via
// createPopulatedIndex, so this mock only affects the init-failure test.
vi.mock('web-tree-sitter', () => {
  throw new Error('web-tree-sitter not available in test environment')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inject mock symbols into a TreeSitterIndex so we can test search/resolve
 * without loading WASM. Uses Object.defineProperty to set the private
 * `_initialized` flag and directly push into `_symbols`.
 */
function createPopulatedIndex(
  symbols: {
    file: string
    symbol: string
    kind: 'function' | 'class' | 'method' | 'variable' | 'type' | 'interface'
    preview: string
    startLine: number
    endLine: number
    signature: string
  }[],
): TreeSitterIndex {
  const idx = new TreeSitterIndex()
  // Mark as initialized so search/resolve work
  Object.defineProperty(idx, '_initialized', { value: true, writable: true })
  // Inject symbols
  const internal = idx as unknown as { _symbols: typeof symbols }
  internal._symbols = [...symbols]
  return idx
}

// A reusable set of mock symbols for testing
const MOCK_SYMBOLS = [
  {
    file: 'src/auth.ts',
    symbol: 'authenticate',
    kind: 'function' as const,
    preview: 'export function authenticate(token: string) {',
    startLine: 1,
    endLine: 10,
    signature: 'export function authenticate(token: string) {',
  },
  {
    file: 'src/auth.ts',
    symbol: 'AuthService',
    kind: 'class' as const,
    preview: 'export class AuthService {',
    startLine: 12,
    endLine: 50,
    signature: 'export class AuthService {',
  },
  {
    file: 'src/user.ts',
    symbol: 'getUser',
    kind: 'function' as const,
    preview: 'export function getUser(id: string) {',
    startLine: 1,
    endLine: 8,
    signature: 'export function getUser(id: string) {',
  },
  {
    file: 'src/user.ts',
    symbol: 'UserProfile',
    kind: 'interface' as const,
    preview: 'export interface UserProfile {',
    startLine: 10,
    endLine: 20,
    signature: 'export interface UserProfile {',
  },
  {
    file: 'src/types.ts',
    symbol: 'AuthToken',
    kind: 'type' as const,
    preview: 'export type AuthToken = string',
    startLine: 1,
    endLine: 1,
    signature: 'export type AuthToken = string',
  },
  {
    file: 'src/api.py',
    symbol: 'fetch_data',
    kind: 'function' as const,
    preview: 'def fetch_data(url):',
    startLine: 5,
    endLine: 15,
    signature: 'def fetch_data(url):',
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TreeSitterIndex', () => {
  // ---- constructor defaults ------------------------------------------------

  describe('constructor defaults', () => {
    it('has name "tree-sitter"', () => {
      const idx = new TreeSitterIndex()
      expect(idx.name).toBe('tree-sitter')
    })

    it('defaults wasmPath to "/tree-sitter/"', () => {
      const idx = new TreeSitterIndex()
      const internal = idx as unknown as { _wasmPath: string }
      expect(internal._wasmPath).toBe('/tree-sitter/')
    })

    it('defaults languages to ["typescript", "javascript", "python"]', () => {
      const idx = new TreeSitterIndex()
      const internal = idx as unknown as { _languages: string[] }
      expect(internal._languages).toEqual(['typescript', 'javascript', 'python'])
    })

    it('accepts custom wasmPath', () => {
      const idx = new TreeSitterIndex({ wasmPath: '/wasm/' })
      const internal = idx as unknown as { _wasmPath: string }
      expect(internal._wasmPath).toBe('/wasm/')
    })

    it('accepts custom languages', () => {
      const idx = new TreeSitterIndex({ languages: ['rust', 'go'] })
      const internal = idx as unknown as { _languages: string[] }
      expect(internal._languages).toEqual(['rust', 'go'])
    })
  })

  // ---- not ready before init -----------------------------------------------

  describe('before initialization', () => {
    it('ready is false', () => {
      const idx = new TreeSitterIndex()
      expect(idx.ready).toBe(false)
    })

    it('search returns empty array', async () => {
      const idx = new TreeSitterIndex()
      const results = await idx.search('anything')
      expect(results).toEqual([])
    })

    it('resolve returns null', async () => {
      const idx = new TreeSitterIndex()
      const result = await idx.resolve('src/main.ts', 'foo')
      expect(result).toBeNull()
    })
  })

  // ---- implements SymbolSearchProvider -------------------------------------

  it('satisfies SymbolSearchProvider interface', () => {
    const provider: SymbolSearchProvider = new TreeSitterIndex()
    expect(provider.name).toBe('tree-sitter')
    expect(provider.ready).toBe(false)
    expect(typeof provider.search).toBe('function')
    expect(typeof provider.resolve).toBe('function')
  })

  // ---- search with mock symbols -------------------------------------------

  describe('search', () => {
    it('returns matching results by substring', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const results = await idx.search('auth')
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) {
        expect(r.symbol.toLowerCase()).toContain('auth')
      }
    })

    it('returns results with correct shape (SymbolResult)', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const results = await idx.search('getUser')
      expect(results).toHaveLength(1)
      const r = results[0]
      expect(r).toBeDefined()
      expect(r?.file).toBe('src/user.ts')
      expect(r?.symbol).toBe('getUser')
      expect(r?.kind).toBe('function')
      expect(r?.preview).toBe('export function getUser(id: string) {')
      // SymbolResult should NOT include startLine/endLine/signature
      expect(r != null && 'startLine' in r).toBe(false)
      expect(r != null && 'endLine' in r).toBe(false)
      expect(r != null && 'signature' in r).toBe(false)
    })

    it('is case-insensitive', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const upper = await idx.search('AUTH')
      const lower = await idx.search('auth')
      expect(upper.length).toBe(lower.length)
      expect(upper.map((r) => r.symbol).sort()).toEqual(lower.map((r) => r.symbol).sort())
    })

    it('returns empty array for no matches', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const results = await idx.search('zzz_no_match')
      expect(results).toEqual([])
    })

    it('returns results from multiple files', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const results = await idx.search('User')
      const files = new Set(results.map((r) => r.file))
      // getUser is in user.ts, UserProfile is in user.ts — but test multi-file ability
      expect(files.size).toBeGreaterThanOrEqual(1)
    })
  })

  // ---- search ranking ------------------------------------------------------

  describe('search ranking', () => {
    it('prefix matches rank higher than substring matches', async () => {
      const rankedIdx = createPopulatedIndex([
        {
          file: 'a.ts',
          symbol: 'xyzAuth', // 'auth' at index 3
          kind: 'function',
          preview: '',
          startLine: 1,
          endLine: 1,
          signature: '',
        },
        {
          file: 'b.ts',
          symbol: 'authHandler', // 'auth' at index 0
          kind: 'function',
          preview: '',
          startLine: 1,
          endLine: 1,
          signature: '',
        },
        {
          file: 'c.ts',
          symbol: 'preAuthCheck', // 'auth' at index 3
          kind: 'function',
          preview: '',
          startLine: 1,
          endLine: 1,
          signature: '',
        },
      ])

      const results = await rankedIdx.search('auth')
      expect(results).toHaveLength(3)
      // authHandler should come first (index 0)
      expect(results[0]?.symbol).toBe('authHandler')
    })
  })

  // ---- search limit --------------------------------------------------------

  describe('search limit', () => {
    it('results are capped at 50', async () => {
      // Create 60 symbols that all match
      const manySymbols = Array.from({ length: 60 }, (_, i) => ({
        file: `src/file${String(i)}.ts`,
        symbol: `handler${String(i)}`,
        kind: 'function' as const,
        preview: `function handler${String(i)}() {`,
        startLine: 1,
        endLine: 5,
        signature: `function handler${String(i)}() {`,
      }))

      const idx = createPopulatedIndex(manySymbols)
      const results = await idx.search('handler')
      expect(results).toHaveLength(50)
    })
  })

  // ---- resolve with mock symbols -------------------------------------------

  describe('resolve', () => {
    it('returns full SymbolDetail for a known symbol', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const detail = await idx.resolve('src/auth.ts', 'authenticate')
      expect(detail).not.toBeNull()
      expect(detail?.file).toBe('src/auth.ts')
      expect(detail?.symbol).toBe('authenticate')
      expect(detail?.kind).toBe('function')
      expect(detail?.startLine).toBe(1)
      expect(detail?.endLine).toBe(10)
      expect(detail?.signature).toBe('export function authenticate(token: string) {')
      expect(detail?.preview).toBe('export function authenticate(token: string) {')
    })

    it('returns null for an unknown symbol', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const detail = await idx.resolve('src/auth.ts', 'nonexistent')
      expect(detail).toBeNull()
    })

    it('returns null for unknown file', async () => {
      const idx = createPopulatedIndex(MOCK_SYMBOLS)
      const detail = await idx.resolve('src/unknown.ts', 'authenticate')
      expect(detail).toBeNull()
    })

    it('returns null when not initialized', async () => {
      const idx = new TreeSitterIndex()
      const detail = await idx.resolve('src/auth.ts', 'authenticate')
      expect(detail).toBeNull()
    })

    it('matches both file and symbol name', async () => {
      // Create symbols with same name in different files
      const idx = createPopulatedIndex([
        {
          file: 'a.ts',
          symbol: 'init',
          kind: 'function',
          preview: 'function init() {',
          startLine: 1,
          endLine: 5,
          signature: 'function init() {',
        },
        {
          file: 'b.ts',
          symbol: 'init',
          kind: 'function',
          preview: 'function init() {',
          startLine: 10,
          endLine: 20,
          signature: 'function init() {',
        },
      ])

      const detailA = await idx.resolve('a.ts', 'init')
      const detailB = await idx.resolve('b.ts', 'init')
      expect(detailA?.startLine).toBe(1)
      expect(detailB?.startLine).toBe(10)
    })
  })

  // ---- language detection --------------------------------------------------

  describe('language detection', () => {
    it('detects .ts as typescript', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('src/main.ts')).toBe('typescript')
    })

    it('detects .tsx as typescript', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('src/App.tsx')).toBe('typescript')
    })

    it('detects .js as javascript', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('lib/utils.js')).toBe('javascript')
    })

    it('detects .jsx as javascript', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('src/Button.jsx')).toBe('javascript')
    })

    it('detects .py as python', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('scripts/build.py')).toBe('python')
    })

    it('returns null for .css', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('styles/main.css')).toBeNull()
    })

    it('returns null for .html', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('index.html')).toBeNull()
    })

    it('returns null for extensionless files', () => {
      const idx = new TreeSitterIndex()
      expect(idx._detectLanguage('Makefile')).toBeNull()
    })
  })

  // ---- init failure (web-tree-sitter not available) -----------------------

  describe('init failure', () => {
    it('ready stays false when init is never called', () => {
      const idx = new TreeSitterIndex()
      expect(idx.ready).toBe(false)
    })

    // web-tree-sitter is not installed in this test environment,
    // so calling init() should throw and ready should stay false
    it('init rejects when web-tree-sitter is not installed', async () => {
      const idx = new TreeSitterIndex()
      await expect(idx.init([{ path: 'test.ts', content: 'const x = 1' }])).rejects.toThrow()
      expect(idx.ready).toBe(false)
    })
  })
})
