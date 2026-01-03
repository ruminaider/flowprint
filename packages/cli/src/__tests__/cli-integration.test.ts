import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'

const CLI = resolve(__dirname, '../../dist/index.js')
const ROOT = resolve(__dirname, '../../../..')
const EXAMPLES = resolve(ROOT, 'examples')
const FIXTURES = resolve(__dirname, 'fixtures')

function run(
  args: string[],
  options?: { cwd?: string },
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      cwd: options?.cwd ?? ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: e.status ?? 1,
    }
  }
}

describe('CLI integration', () => {
  describe('flowprint --help', () => {
    it('should display help with all commands', () => {
      const { stdout, exitCode } = run(['--help'])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('validate')
      expect(stdout).toContain('lint')
      expect(stdout).toContain('diff')
      expect(stdout).toContain('migrate')
      expect(stdout).toContain('init')
      expect(stdout).toContain('Exit codes')
    })
  })

  describe('flowprint validate', () => {
    it('should validate all example blueprints successfully', () => {
      const { stdout, exitCode } = run(['validate', `${EXAMPLES}/*.flowprint.yaml`])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('PASS')
    })

    it('should exit 2 for no matching files', () => {
      const { exitCode } = run(['validate', 'no-match-*.yaml'])
      expect(exitCode).toBe(2)
    })
  })

  describe('flowprint lint', () => {
    it('should lint all example blueprints successfully', () => {
      const { stdout, exitCode } = run(['lint', `${EXAMPLES}/*.flowprint.yaml`])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('PASS')
    })

    it('should exit 2 for no matching files', () => {
      const { exitCode } = run(['lint', 'no-match-*.yaml'])
      expect(exitCode).toBe(2)
    })

    it('should respect custom .flowprintrc.yaml config via --config', () => {
      const configPath = resolve(FIXTURES, '.flowprintrc.yaml')
      const { stdout, exitCode } = run([
        'lint',
        `${EXAMPLES}/*.flowprint.yaml`,
        '--config',
        configPath,
      ])
      // The custom config sets require-description to error, so example files
      // without descriptions on all action nodes should trigger errors
      expect(stdout).toContain('require-description')
      expect(exitCode).toBe(1)
    })
  })

  describe('flowprint diff', () => {
    it('should show differences between two files', () => {
      const { stdout, exitCode } = run([
        'diff',
        `${EXAMPLES}/prescription-fulfillment.flowprint.yaml`,
        `${EXAMPLES}/subscription-renewal.flowprint.yaml`,
      ])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('difference(s) found')
    })

    it('should show no differences for same file', () => {
      const { stdout, exitCode } = run([
        'diff',
        `${EXAMPLES}/prescription-fulfillment.flowprint.yaml`,
        `${EXAMPLES}/prescription-fulfillment.flowprint.yaml`,
      ])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('No structural differences found')
    })

    it('should exit 0 even when a file cannot be read', () => {
      const { exitCode } = run([
        'diff',
        'nonexistent-file.yaml',
        `${EXAMPLES}/prescription-fulfillment.flowprint.yaml`,
      ])
      // Per spec, diff always exits 0 (informational command)
      expect(exitCode).toBe(0)
    })
  })

  describe('flowprint migrate', () => {
    it('should report already at latest version', () => {
      const { stdout, exitCode } = run(['migrate'])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Already at latest version (flowprint/1.0)')
    })
  })

  describe('flowprint init', () => {
    const testOutput = resolve(ROOT, 'test-init-output.flowprint.yaml')

    afterEach(() => {
      if (existsSync(testOutput)) {
        unlinkSync(testOutput)
      }
    })

    it('should create a starter blueprint', () => {
      const { stdout, exitCode } = run([
        'init',
        'test-init-output',
        '--non-interactive',
        '-o',
        testOutput,
      ])
      expect(exitCode).toBe(0)
      expect(stdout).toContain('Created')
      expect(existsSync(testOutput)).toBe(true)
    })

    it('should exit 2 if file already exists', () => {
      // Create file first
      run(['init', 'test-init-output', '--non-interactive', '-o', testOutput])
      // Try again
      const { exitCode } = run(['init', 'test-init-output', '--non-interactive', '-o', testOutput])
      expect(exitCode).toBe(2)
    })
  })
})
