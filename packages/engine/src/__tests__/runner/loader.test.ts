import { describe, it, expect } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadEntryPoint } from '../../runner/loader.js'

describe('loadEntryPoint', () => {
  const testDir = join(tmpdir(), 'flowprint-loader-test-' + String(Date.now()))

  // Create test fixtures
  function setup(): void {
    mkdirSync(testDir, { recursive: true })

    // Valid module with named export
    writeFileSync(
      join(testDir, 'valid.mjs'),
      `export function process(input) { return { processed: true, input } }
export function helper() { return 'help' }`,
    )

    // Module with no functions
    writeFileSync(join(testDir, 'no-funcs.mjs'), `export const value = 42`)
  }

  function teardown(): void {
    rmSync(testDir, { recursive: true, force: true })
  }

  it('loads a valid entry point', async () => {
    setup()
    try {
      const fn = await loadEntryPoint({ file: 'valid.mjs', symbol: 'process' }, testDir)
      expect(typeof fn).toBe('function')
      const result = await fn({ x: 1 })
      expect(result).toEqual({ processed: true, input: { x: 1 } })
    } finally {
      teardown()
    }
  })

  it('throws descriptive error for missing file', async () => {
    await expect(
      loadEntryPoint({ file: 'nonexistent.mjs', symbol: 'process' }, '/tmp/does-not-exist'),
    ).rejects.toThrow(/Failed to load entry point file/)
  })

  it('throws descriptive error for missing symbol', async () => {
    setup()
    try {
      await expect(
        loadEntryPoint({ file: 'valid.mjs', symbol: 'nonexistent' }, testDir),
      ).rejects.toThrow(/Symbol "nonexistent" not found/)
    } finally {
      teardown()
    }
  })

  it('lists available functions when symbol is missing', async () => {
    setup()
    try {
      await expect(
        loadEntryPoint({ file: 'valid.mjs', symbol: 'missing' }, testDir),
      ).rejects.toThrow(/Available functions:.*process/)
    } finally {
      teardown()
    }
  })

  it('throws when symbol exists but is not a function', async () => {
    setup()
    try {
      await expect(
        loadEntryPoint({ file: 'no-funcs.mjs', symbol: 'value' }, testDir),
      ).rejects.toThrow(/not found or not a function/)
    } finally {
      teardown()
    }
  })
})
