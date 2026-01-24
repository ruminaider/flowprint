import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const CLI = resolve(__dirname, '../../dist/index.js')
const EXAMPLES = resolve(__dirname, '../../../..', 'examples')

function run(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [CLI, ...args], {
      encoding: 'utf-8',
      cwd: resolve(__dirname, '../../../..'),
    })
    return { stdout, exitCode: 0 }
  } catch (err: unknown) {
    const e = err as { stdout?: string; status?: number }
    return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 }
  }
}

describe('flowprint validate', () => {
  it('should pass all example blueprints', () => {
    const { stdout, exitCode } = run(['validate', `${EXAMPLES}/*.flowprint.yaml`])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('PASS')
    expect(stdout).toContain('prescription-fulfillment.flowprint.yaml')
    expect(stdout).toContain('subscription-renewal.flowprint.yaml')
    expect(stdout).toContain('consultation-flow.flowprint.yaml')
  })

  it('should exit 2 for non-existent glob', () => {
    const { exitCode } = run(['validate', 'nonexistent/*.yaml'])
    expect(exitCode).toBe(2)
  })

  it('should exit 1 for invalid blueprint with dangling references', () => {
    const { stdout, exitCode } = run([
      'validate',
      resolve(__dirname, 'fixtures/invalid.flowprint.yaml'),
    ])
    expect(exitCode).toBe(1)
    expect(stdout).toContain('FAIL')
  })
})
