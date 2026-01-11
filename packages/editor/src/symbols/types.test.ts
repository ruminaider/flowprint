import { describe, it, expect } from 'vitest'
import type { SymbolResult, SymbolDetail, SymbolSearchProvider } from './types'

// ---------------------------------------------------------------------------
// Type-level helpers
// ---------------------------------------------------------------------------

/** Compile-time assertion that A is assignable to B. */
type AssertAssignable<A, B> = A extends B ? true : never

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------

class MockProvider implements SymbolSearchProvider {
  readonly name = 'mock'
  readonly ready = true

  search(query: string): Promise<SymbolResult[]> {
    return Promise.resolve([
      {
        file: 'src/main.ts',
        symbol: query,
        kind: 'function',
        preview: `function ${query}() {`,
      },
    ])
  }

  resolve(file: string, symbol: string): Promise<SymbolDetail | null> {
    if (file === 'missing.ts') return Promise.resolve(null)
    return Promise.resolve({
      file,
      symbol,
      kind: 'function',
      startLine: 1,
      endLine: 5,
      signature: `function ${symbol}(): void`,
    })
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SymbolSearchProvider interface types', () => {
  // ---- importability -------------------------------------------------------

  it('interfaces are importable', () => {
    // If this test compiles, the imports resolved correctly.
    const result: SymbolResult = {
      file: 'a.ts',
      symbol: 'foo',
      kind: 'function',
    }
    expect(result).toBeDefined()
  })

  // ---- mock satisfies interface --------------------------------------------

  it('mock implementation satisfies SymbolSearchProvider', () => {
    const provider: SymbolSearchProvider = new MockProvider()
    expect(provider.name).toBe('mock')
    expect(provider.ready).toBe(true)
  })

  it('search returns SymbolResult[]', async () => {
    const provider: SymbolSearchProvider = new MockProvider()
    const results = await provider.search('hello')
    expect(results).toHaveLength(1)
    expect(results[0]?.kind).toBe('function')
    expect(results[0]?.preview).toBe('function hello() {')
  })

  it('resolve returns SymbolDetail or null', async () => {
    const provider: SymbolSearchProvider = new MockProvider()

    const detail = await provider.resolve('src/main.ts', 'hello')
    expect(detail).not.toBeNull()
    expect(detail?.startLine).toBe(1)
    expect(detail?.endLine).toBe(5)
    expect(detail?.signature).toBe('function hello(): void')

    const missing = await provider.resolve('missing.ts', 'nope')
    expect(missing).toBeNull()
  })

  // ---- SymbolDetail extends SymbolResult -----------------------------------

  it('SymbolDetail extends SymbolResult', () => {
    const detail: SymbolDetail = {
      file: 'a.ts',
      symbol: 'foo',
      kind: 'class',
      startLine: 10,
      endLine: 20,
    }

    // A SymbolDetail is assignable to SymbolResult
    const result: SymbolResult = detail
    expect(result.file).toBe('a.ts')
    expect(result.kind).toBe('class')

    // Compile-time proof of assignability
    const _proof: AssertAssignable<SymbolDetail, SymbolResult> = true
    expect(_proof).toBe(true)
  })

  // ---- SymbolResult kind values --------------------------------------------

  it('all SymbolResult kind values are valid', () => {
    const validKinds: SymbolResult['kind'][] = [
      'function',
      'class',
      'method',
      'variable',
      'type',
      'interface',
    ]

    // Verify all six values compile and are distinct
    expect(validKinds).toHaveLength(6)
    expect(new Set(validKinds).size).toBe(6)

    // Each value can be assigned to a SymbolResult
    for (const kind of validKinds) {
      const r: SymbolResult = { file: 'x.ts', symbol: 'x', kind }
      expect(r.kind).toBe(kind)
    }
  })

  // ---- optional fields -----------------------------------------------------

  it('preview is optional on SymbolResult', () => {
    const withPreview: SymbolResult = {
      file: 'a.ts',
      symbol: 'foo',
      kind: 'variable',
      preview: 'const foo = 42',
    }
    const withoutPreview: SymbolResult = {
      file: 'a.ts',
      symbol: 'foo',
      kind: 'variable',
    }
    expect(withPreview.preview).toBe('const foo = 42')
    expect(withoutPreview.preview).toBeUndefined()
  })

  it('signature is optional on SymbolDetail', () => {
    const withSig: SymbolDetail = {
      file: 'a.ts',
      symbol: 'bar',
      kind: 'method',
      startLine: 1,
      endLine: 3,
      signature: 'bar(): string',
    }
    const withoutSig: SymbolDetail = {
      file: 'a.ts',
      symbol: 'bar',
      kind: 'method',
      startLine: 1,
      endLine: 3,
    }
    expect(withSig.signature).toBe('bar(): string')
    expect(withoutSig.signature).toBeUndefined()
  })
})
