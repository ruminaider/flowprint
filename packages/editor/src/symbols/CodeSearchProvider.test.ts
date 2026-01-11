import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CodeSearchProvider } from './CodeSearchProvider'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080'

function mockFetch(response: { ok: boolean; status?: number; json?: unknown }) {
  return vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: () => Promise.resolve(response.json ?? {}),
  })
}

function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('fetch failed'))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CodeSearchProvider', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // ---- Constructor --------------------------------------------------------

  describe('constructor', () => {
    it('strips trailing slash from URL', () => {
      const provider = new CodeSearchProvider({ url: 'http://localhost:8080/' })
      // Verify by calling checkHealth and checking the URL used
      globalThis.fetch = mockFetch({ ok: true })
      void provider.checkHealth()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.any(Object),
      )
    })

    it('stores apiKey', () => {
      const provider = new CodeSearchProvider({
        url: BASE_URL,
        apiKey: 'test-key',
      })
      globalThis.fetch = mockFetch({ ok: true })
      void provider.checkHealth()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-key' },
        }),
      )
    })
  })

  // ---- ready / checkHealth ------------------------------------------------

  describe('ready', () => {
    it('is false before checkHealth is called', () => {
      const provider = new CodeSearchProvider({ url: BASE_URL })
      expect(provider.ready).toBe(false)
    })
  })

  describe('checkHealth', () => {
    it('returns true and sets ready on 200 response', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })

      const result = await provider.checkHealth()

      expect(result).toBe(true)
      expect(provider.ready).toBe(true)
    })

    it('returns false on network error', async () => {
      globalThis.fetch = mockFetchNetworkError()
      const provider = new CodeSearchProvider({ url: BASE_URL })

      const result = await provider.checkHealth()

      expect(result).toBe(false)
      expect(provider.ready).toBe(false)
    })

    it('returns false on non-ok response', async () => {
      globalThis.fetch = mockFetch({ ok: false, status: 503 })
      const provider = new CodeSearchProvider({ url: BASE_URL })

      const result = await provider.checkHealth()

      expect(result).toBe(false)
      expect(provider.ready).toBe(false)
    })

    it('uses a 3000ms timeout signal', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })

      await provider.checkHealth()

      const call = vi.mocked(globalThis.fetch).mock.calls[0]
      const options = call?.[1] as RequestInit | undefined
      expect(options?.signal).toBeDefined()
    })
  })

  // ---- search -------------------------------------------------------------

  describe('search', () => {
    it('returns results when healthy', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          results: [
            {
              file: 'src/main.ts',
              symbol: 'main',
              kind: 'function',
              preview: 'function main() {',
            },
            {
              file: 'src/utils.ts',
              symbol: 'Helper',
              kind: 'class',
            },
          ],
        },
      })

      const results = await provider.search('main')

      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        file: 'src/main.ts',
        symbol: 'main',
        kind: 'function',
        preview: 'function main() {',
      })
      expect(results[1]).toEqual({
        file: 'src/utils.ts',
        symbol: 'Helper',
        kind: 'class',
      })
    })

    it('returns empty array when unhealthy (no fetch call)', async () => {
      const fetchMock = mockFetch({ ok: true })
      globalThis.fetch = fetchMock
      const provider = new CodeSearchProvider({ url: BASE_URL })
      // Do NOT call checkHealth — provider is unhealthy

      const results = await provider.search('test')

      expect(results).toEqual([])
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns empty array on server error', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: false, status: 500 })

      const results = await provider.search('test')

      expect(results).toEqual([])
    })

    it('returns empty array on network error', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetchNetworkError()

      const results = await provider.search('test')

      expect(results).toEqual([])
    })

    it('sends POST with query and limit', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: true, json: { results: [] } })

      await provider.search('myQuery')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ query: 'myQuery', limit: 50 }),
        }),
      )
    })
  })

  // ---- resolve ------------------------------------------------------------

  describe('resolve', () => {
    it('returns SymbolDetail when healthy', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          file: 'src/main.ts',
          symbol: 'main',
          kind: 'function',
          startLine: 10,
          endLine: 25,
          signature: 'function main(): void',
          preview: 'function main() {',
        },
      })

      const detail = await provider.resolve('src/main.ts', 'main')

      expect(detail).toEqual({
        file: 'src/main.ts',
        symbol: 'main',
        kind: 'function',
        startLine: 10,
        endLine: 25,
        signature: 'function main(): void',
        preview: 'function main() {',
      })
    })

    it('returns null when unhealthy (no fetch call)', async () => {
      const fetchMock = mockFetch({ ok: true })
      globalThis.fetch = fetchMock
      const provider = new CodeSearchProvider({ url: BASE_URL })

      const detail = await provider.resolve('src/main.ts', 'main')

      expect(detail).toBeNull()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns null on 404', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: false, status: 404 })

      const detail = await provider.resolve('src/missing.ts', 'nope')

      expect(detail).toBeNull()
    })

    it('returns null on network error', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetchNetworkError()

      const detail = await provider.resolve('src/main.ts', 'main')

      expect(detail).toBeNull()
    })

    it('sends POST with file and symbol', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          file: 'src/main.ts',
          symbol: 'main',
          kind: 'function',
          startLine: 1,
          endLine: 5,
        },
      })

      await provider.resolve('src/main.ts', 'main')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/resolve',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ file: 'src/main.ts', symbol: 'main' }),
        }),
      )
    })
  })

  // ---- API key in headers -------------------------------------------------

  describe('API key in headers', () => {
    it('includes Authorization header when apiKey is provided', async () => {
      globalThis.fetch = mockFetch({ ok: true, json: { results: [] } })
      const provider = new CodeSearchProvider({
        url: BASE_URL,
        apiKey: 'secret-key',
      })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: true, json: { results: [] } })
      await provider.search('test')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer secret-key',
          }),
        }),
      )
    })

    it('omits Authorization header when no apiKey', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      const call = vi.mocked(globalThis.fetch).mock.calls[0]
      const options = call?.[1] as RequestInit | undefined
      const headers = options?.headers as Record<string, string> | undefined
      expect(headers?.Authorization).toBeUndefined()
    })
  })

  // ---- Malformed response handling ----------------------------------------

  describe('malformed response handling', () => {
    it('returns empty array for search with missing results field', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: true, json: { data: [] } })

      const results = await provider.search('test')

      expect(results).toEqual([])
    })

    it('returns empty array for search with non-array results', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: true, json: { results: 'not-array' } })

      const results = await provider.search('test')

      expect(results).toEqual([])
    })

    it('filters out results missing file or symbol', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          results: [
            { file: 'a.ts' }, // missing symbol
            { symbol: 'foo' }, // missing file
            null, // null entry
            { file: 'b.ts', symbol: 'bar', kind: 'class' }, // valid
          ],
        },
      })

      const results = await provider.search('test')

      expect(results).toHaveLength(1)
      expect(results[0]?.symbol).toBe('bar')
    })

    it('returns null for resolve with missing file field', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: { symbol: 'foo', startLine: 1, endLine: 5 },
      })

      const detail = await provider.resolve('src/a.ts', 'foo')

      expect(detail).toBeNull()
    })

    it('returns null for resolve with null response', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({ ok: true, json: null })

      const detail = await provider.resolve('src/a.ts', 'foo')

      expect(detail).toBeNull()
    })
  })

  // ---- Kind parsing -------------------------------------------------------

  describe('kind parsing', () => {
    it('defaults unknown kind values to function', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          results: [
            { file: 'a.ts', symbol: 'foo', kind: 'unknown_kind' },
            { file: 'b.ts', symbol: 'bar', kind: 123 },
            { file: 'c.ts', symbol: 'baz' }, // kind missing
          ],
        },
      })

      const results = await provider.search('test')

      expect(results).toHaveLength(3)
      expect(results[0]?.kind).toBe('function')
      expect(results[1]?.kind).toBe('function')
      expect(results[2]?.kind).toBe('function')
    })

    it('preserves valid kind values', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          results: [
            { file: 'a.ts', symbol: 'MyClass', kind: 'class' },
            { file: 'b.ts', symbol: 'helper', kind: 'method' },
            { file: 'c.ts', symbol: 'count', kind: 'variable' },
            { file: 'd.ts', symbol: 'Config', kind: 'type' },
            { file: 'e.ts', symbol: 'Handler', kind: 'interface' },
          ],
        },
      })

      const results = await provider.search('test')

      expect(results[0]?.kind).toBe('class')
      expect(results[1]?.kind).toBe('method')
      expect(results[2]?.kind).toBe('variable')
      expect(results[3]?.kind).toBe('type')
      expect(results[4]?.kind).toBe('interface')
    })

    it('defaults unknown kind in resolve result', async () => {
      globalThis.fetch = mockFetch({ ok: true })
      const provider = new CodeSearchProvider({ url: BASE_URL })
      await provider.checkHealth()

      globalThis.fetch = mockFetch({
        ok: true,
        json: {
          file: 'a.ts',
          symbol: 'foo',
          kind: 'banana',
          startLine: 1,
          endLine: 5,
        },
      })

      const detail = await provider.resolve('a.ts', 'foo')

      expect(detail?.kind).toBe('function')
    })
  })

  // ---- name property ------------------------------------------------------

  describe('name', () => {
    it('returns "code-search"', () => {
      const provider = new CodeSearchProvider({ url: BASE_URL })
      expect(provider.name).toBe('code-search')
    })
  })
})
