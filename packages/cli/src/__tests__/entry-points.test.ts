import { describe, it, expect } from 'vitest'
import { checkEntryPoints } from '../entry-points.js'
import { resolve } from 'node:path'

const EXAMPLES_DIR = resolve(__dirname, '../../../../examples')

describe('checkEntryPoints', () => {
  it('should report warnings for non-existent files', async () => {
    const yaml = `
schema: flowprint/1.0
name: test
version: '1.0.0'
lanes:
  front:
    label: Front
    visibility: external
    order: 0
nodes:
  my_action:
    type: action
    lane: front
    label: Test
    entry_points:
      - file: nonexistent/file.py
        symbol: my_func
    next: done
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    const warnings = await checkEntryPoints(yaml, `${EXAMPLES_DIR}/test.flowprint.yaml`)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('file not found')
    expect(warnings[0]).toContain('my_action')
  })

  it('should return empty array when no entry points exist', async () => {
    const yaml = `
schema: flowprint/1.0
name: test
version: '1.0.0'
lanes:
  front:
    label: Front
    visibility: external
    order: 0
nodes:
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    const warnings = await checkEntryPoints(yaml, `${EXAMPLES_DIR}/test.flowprint.yaml`)
    expect(warnings).toHaveLength(0)
  })
})
