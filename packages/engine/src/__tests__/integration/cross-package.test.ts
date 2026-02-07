import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { validateYaml, serialize } from '@ruminaider/flowprint-schema'
import { runGraph } from '../../runner/walker.js'
import { validateExpressions } from '../../expressions/validator.js'
import { generateCode } from '../../codegen/index.js'

vi.mock('../../runner/loader.js', () => ({
  loadEntryPoint: vi.fn().mockResolvedValue(() => ({
    id: 'mock-id',
    status: 'ok',
    outcome: 'treatment_prescribed',
    isValid: true,
    severity: 'normal',
    needs_specialist: false,
    self_guided: false,
  })),
}))

const EXAMPLES_DIR = resolve(import.meta.dirname, '../../../../..', 'examples')

const STUBS_YAML = resolve(EXAMPLES_DIR, 'consultation-flow-v2-stubs.flowprint.yaml')
const V2_YAML = resolve(EXAMPLES_DIR, 'consultation-flow-v2.flowprint.yaml')
const FIXTURES_PATH = resolve(EXAMPLES_DIR, 'stubs/consultation/fixtures.json')

function loadYaml(path: string): FlowprintDocument {
  return parse(readFileSync(path, 'utf-8')) as FlowprintDocument
}

function loadFixtures(): Record<string, unknown> {
  return JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8')) as Record<string, unknown>
}

describe('cross-package integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validate then run: stubs doc passes validation and runs to completion', async () => {
    const raw = readFileSync(STUBS_YAML, 'utf-8')
    const validation = validateYaml(raw)
    expect(validation.valid).toBe(true)

    const doc = loadYaml(STUBS_YAML)
    const exprResult = validateExpressions(doc)
    expect(exprResult.valid).toBe(true)

    const fixtures = loadFixtures()
    const trace = await runGraph(doc, {
      input: { patient_id: 'P001', symptoms: ['headache'] },
      projectRoot: EXAMPLES_DIR,
      fixtures,
    })

    expect(trace.status).toBe('success')
    expect(trace.steps.length).toBeGreaterThan(0)
  })

  it('validate then generate: v2 doc produces 7 generated files', () => {
    const raw = readFileSync(V2_YAML, 'utf-8')
    const validation = validateYaml(raw)
    expect(validation.valid).toBe(true)

    const doc = loadYaml(V2_YAML)
    const result = generateCode(doc, { outputDir: './out', flowName: doc.name })

    expect(result.files).toHaveLength(7)
    const paths = result.files.map((f) => f.path)
    expect(paths).toContain('workflow.ts')
    expect(paths).toContain('activities.ts')
    expect(paths).toContain('worker.ts')
    expect(paths).toContain('types.ts')
  })

  it('serialize roundtrip validates', () => {
    const doc: FlowprintDocument = {
      schema: 'flowprint/2.0',
      name: 'roundtrip-test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'internal', order: 0 },
      },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          entry_points: [{ file: 'src/start.ts', symbol: 'start' }],
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    }

    const yaml = serialize(doc)
    expect(yaml).toContain('flowprint/2.0')
    expect(yaml).toContain('roundtrip-test')

    const validation = validateYaml(yaml)
    expect(validation.valid).toBe(true)
  })

  it('v1 doc fails v2 expression validation for entry_point count', () => {
    // v1 docs don't require entry_points, but v2 does
    // Construct a doc with v2 schema but missing entry_points to verify enforcement
    const doc: FlowprintDocument = {
      schema: 'flowprint/2.0',
      name: 'v2-strict-test',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main', visibility: 'internal', order: 0 },
      },
      nodes: {
        act: {
          type: 'action',
          lane: 'main',
          label: 'Act',
          next: 'done',
          // No entry_points — invalid for v2
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    }

    const result = validateExpressions(doc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.message.includes('exactly one entry_point'))).toBe(true)
  })

  it('all v2 generated code has balanced braces and parens', () => {
    const v2Files = readdirSync(EXAMPLES_DIR).filter(
      (f) => f.endsWith('.flowprint.yaml') && f.includes('v2'),
    )
    expect(v2Files.length).toBeGreaterThan(0)

    for (const file of v2Files) {
      const content = readFileSync(resolve(EXAMPLES_DIR, file), 'utf-8')
      const doc = parse(content) as FlowprintDocument
      const result = generateCode(doc, { outputDir: './out', flowName: doc.name })

      for (const genFile of result.files) {
        const openBraces = (genFile.content.match(/\{/g) ?? []).length
        const closeBraces = (genFile.content.match(/\}/g) ?? []).length
        expect(openBraces, `${file}/${genFile.path} braces`).toBe(closeBraces)

        const openParens = (genFile.content.match(/\(/g) ?? []).length
        const closeParens = (genFile.content.match(/\)/g) ?? []).length
        expect(openParens, `${file}/${genFile.path} parens`).toBe(closeParens)
      }
    }
  })
})
