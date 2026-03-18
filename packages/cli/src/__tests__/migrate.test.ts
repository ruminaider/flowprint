import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const CLI = resolve(__dirname, '../../dist/index.js')

function run(
  args: string[],
  cwd?: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      cwd: cwd ?? resolve(__dirname, '../../../..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number }
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.status ?? 1 }
  }
}

const VALID_1_0 = `schema: flowprint/1.0
name: test
version: "1.0.0"
lanes:
  main:
    label: Main
    visibility: external
    order: 0
nodes:
  done:
    type: terminal
    lane: main
    label: Done
    outcome: completed
`

describe('flowprint migrate', () => {
  it('exits 0 when document is already at current version', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'fp-migrate-'))
    const file = join(tmp, 'test.flowprint.yaml')
    writeFileSync(file, VALID_1_0)
    try {
      const { exitCode, stdout } = run(['migrate', file])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('current')
    } finally {
      rmSync(tmp, { recursive: true })
    }
  })

  it('shows help text with exit codes', () => {
    const { stdout } = run(['migrate', '--help'])
    expect(stdout).toContain('Exit codes')
    expect(stdout).toContain('dry-run')
  })

  it('exits non-zero for unreadable file', () => {
    const { exitCode } = run(['migrate', '/nonexistent/file.yaml'])
    expect(exitCode).not.toBe(0)
  })

  it('--dry-run does not modify the file', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'fp-migrate-'))
    const file = join(tmp, 'test.flowprint.yaml')
    writeFileSync(file, VALID_1_0)
    try {
      run(['migrate', '--dry-run', file])
      expect(readFileSync(file, 'utf-8')).toBe(VALID_1_0)
    } finally {
      rmSync(tmp, { recursive: true })
    }
  })
})
