import { describe, it, expect, afterAll } from 'vitest'
import { checkEntryPoints, _resetTreeSitterState } from '../entry-points.js'
import { resolve } from 'node:path'

const FIXTURES_DIR = resolve(__dirname, 'fixtures')

afterAll(() => {
  _resetTreeSitterState()
})

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
    const warnings = await checkEntryPoints(yaml, `${FIXTURES_DIR}/test.flowprint.yaml`)
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
    const warnings = await checkEntryPoints(yaml, `${FIXTURES_DIR}/test.flowprint.yaml`)
    expect(warnings).toHaveLength(0)
  })

  it('should find existing Python symbols in a real source file', async () => {
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
  process:
    type: action
    lane: front
    label: Process Order
    entry_points:
      - file: src/__tests__/fixtures/sample_module.py
        symbol: process_order
    next: service
  service:
    type: action
    lane: front
    label: Order Service
    entry_points:
      - file: src/__tests__/fixtures/sample_module.py
        symbol: OrderService
    next: async_step
  async_step:
    type: action
    lane: front
    label: Async Handler
    entry_points:
      - file: src/__tests__/fixtures/sample_module.py
        symbol: async_handler
    next: done
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    // Use the CLI package root as the base (where package.json is)
    const cliRoot = resolve(__dirname, '../..')
    const warnings = await checkEntryPoints(yaml, `${cliRoot}/test.flowprint.yaml`)
    expect(warnings).toHaveLength(0)
  })

  it('should report missing Python symbols in a real source file', async () => {
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
  process:
    type: action
    lane: front
    label: Process Order
    entry_points:
      - file: src/__tests__/fixtures/sample_module.py
        symbol: nonexistent_function
    next: done
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    const cliRoot = resolve(__dirname, '../..')
    const warnings = await checkEntryPoints(yaml, `${cliRoot}/test.flowprint.yaml`)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('nonexistent_function')
    expect(warnings[0]).toContain('not found')
  })

  it('should find existing TypeScript symbols in a real source file', async () => {
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
  process:
    type: action
    lane: front
    label: Process Order
    entry_points:
      - file: src/__tests__/fixtures/sample_module.ts
        symbol: processOrder
    next: timeout
  timeout:
    type: action
    lane: front
    label: Timeout Const
    entry_points:
      - file: src/__tests__/fixtures/sample_module.ts
        symbol: ORDER_TIMEOUT
    next: service
  service:
    type: action
    lane: front
    label: Order Service
    entry_points:
      - file: src/__tests__/fixtures/sample_module.ts
        symbol: OrderService
    next: done
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    const cliRoot = resolve(__dirname, '../..')
    const warnings = await checkEntryPoints(yaml, `${cliRoot}/test.flowprint.yaml`)
    expect(warnings).toHaveLength(0)
  })

  it('should report missing TypeScript symbols in a real source file', async () => {
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
  process:
    type: action
    lane: front
    label: Process Order
    entry_points:
      - file: src/__tests__/fixtures/sample_module.ts
        symbol: doesNotExist
    next: done
  done:
    type: terminal
    lane: front
    label: Done
    outcome: success
`
    const cliRoot = resolve(__dirname, '../..')
    const warnings = await checkEntryPoints(yaml, `${cliRoot}/test.flowprint.yaml`)
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('doesNotExist')
    expect(warnings[0]).toContain('not found')
  })
})
