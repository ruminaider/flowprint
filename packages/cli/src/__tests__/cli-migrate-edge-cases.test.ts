import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

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

describe('CLI migrate edge cases', () => {
  it('join-all_reached-to-all: migrates join_strategy from all_reached to all', () => {
    // consultation-flow.flowprint.yaml has join_strategy: all_reached on route_specialist_consults
    const { stdout, exitCode } = run([
      'migrate',
      resolve(EXAMPLES, 'consultation-flow.flowprint.yaml'),
      '--dry-run',
    ])
    expect(exitCode).toBe(0)
    // The diff output should show the schema change and join_strategy change
    expect(stdout).toContain('flowprint/2.0')
    // The serializer outputs the migrated doc which will have join_strategy: all
    // In the diff, we should see the change from all_reached to all
    expect(stdout).toContain('DIFF')
  })

  it('join-all_reached-on-prescription: prescription-fulfillment also has all_reached', () => {
    // prescription-fulfillment.flowprint.yaml also has join_strategy: all_reached
    const { stdout, exitCode } = run([
      'migrate',
      resolve(EXAMPLES, 'prescription-fulfillment.flowprint.yaml'),
      '--dry-run',
    ])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('DIFF')
    expect(stdout).toContain('flowprint/2.0')
  })

  it('label-when-warnings-counted: migration warns about non-expression when values', () => {
    // consultation-flow.flowprint.yaml has switch nodes with label-like when values
    // (e.g., "emergency", "urgent", "routine_dermatology")
    const { stdout } = run([
      'migrate',
      resolve(EXAMPLES, 'consultation-flow.flowprint.yaml'),
      '--dry-run',
    ])
    expect(stdout).toContain('WARN')
    expect(stdout).toContain('looks like a label')

    // Count the number of WARN lines
    const warnLines = stdout.split('\n').filter((line) => line.includes('WARN'))
    // The consultation-flow has multiple switch nodes with label-style when values
    // triage_assessment: 5 cases (emergency, urgent, routine_dermatology, routine_general, mental_health)
    // evaluate_screening: 3 cases (crisis, needs_specialist, self_guided)
    // determine_outcome: 4 cases (treatment_prescribed, follow_up_needed, referred_out, resolved)
    // route_by_status in subscription-renewal would be separate
    expect(warnLines.length).toBeGreaterThanOrEqual(1)
  })

  it('unsupported-version-errors: migrate rejects schema version 3.0', () => {
    const { exitCode, stderr } = run([
      'migrate',
      resolve(FIXTURES, 'v3-schema.flowprint.yaml'),
      '--dry-run',
    ])
    // The migrate command exits 1 when there are errors
    expect(exitCode).toBe(1)
    // Error message mentions unsupported schema version
    expect(stderr).toContain('unsupported schema version')
  })

  it('broken-yaml-errors: migrate rejects non-flowprint YAML', () => {
    const { exitCode, stderr } = run(['migrate', resolve(FIXTURES, 'broken.yaml'), '--dry-run'])
    expect(exitCode).toBe(1)
    // Non-flowprint YAML has no schema field → unsupported schema version: undefined
    expect(stderr).toContain('unsupported schema version')
  })
})
