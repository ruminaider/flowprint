import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { parse } from 'yaml'
import { serialize, validateYaml } from '../index.js'
import type { FlowprintDocument } from '../types.js'

const EXAMPLES_DIR = resolve(__dirname, '../../../../examples')

/**
 * Load all example .flowprint.yaml files.
 */
function loadExamples(): { name: string; content: string; path: string }[] {
  const files = readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.flowprint.yaml'))
  return files.map((f) => ({
    name: f,
    content: readFileSync(join(EXAMPLES_DIR, f), 'utf-8'),
    path: join(EXAMPLES_DIR, f),
  }))
}

/**
 * Helper to create a minimal valid FlowprintDocument.
 */
function makeDoc(overrides: Partial<FlowprintDocument> = {}): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test-blueprint',
    version: '1.0.0',
    lanes: {
      main: { label: 'Main', visibility: 'internal', order: 0 },
    },
    nodes: {
      start: { type: 'action', lane: 'main', label: 'Start', next: 'done' },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
    ...overrides,
  }
}

describe('serialize round-trip', () => {
  it('all-examples-idempotent: parse -> serialize -> parse -> serialize yields same YAML', () => {
    const examples = loadExamples()
    expect(examples.length).toBeGreaterThan(0)

    for (const example of examples) {
      const doc1 = parse(example.content) as FlowprintDocument
      const yaml1 = serialize(doc1)
      const doc2 = parse(yaml1) as FlowprintDocument
      const yaml2 = serialize(doc2)
      expect(yaml1, `Idempotency failed for ${example.name}`).toBe(yaml2)
    }
  })

  it('serialize-then-revalidate: serialized v1 docs pass validation', () => {
    const examples = loadExamples()
    const v1Examples = examples.filter((e) => {
      const doc = parse(e.content) as FlowprintDocument
      return doc.schema === 'flowprint/1.0'
    })
    expect(v1Examples.length).toBeGreaterThan(0)

    for (const example of v1Examples) {
      const doc = parse(example.content) as FlowprintDocument
      const serialized = serialize(doc)
      const result = validateYaml(serialized)
      expect(
        result.valid,
        `Re-validation failed for ${example.name}: ${JSON.stringify(result.errors)}`,
      ).toBe(true)
    }
  })

  it('yaml-reserved-in-labels: string labels like "true", "null", "yes" survive round-trip', () => {
    const doc = makeDoc({
      nodes: {
        sw: {
          type: 'switch',
          lane: 'main',
          label: 'Router',
          cases: [
            { when: 'true', next: 'a' },
            { when: 'null', next: 'b' },
            { when: 'yes', next: 'c' },
          ],
          default: 'done',
        },
        a: { type: 'terminal', lane: 'main', label: 'A', outcome: 'success' },
        b: { type: 'terminal', lane: 'main', label: 'B', outcome: 'success' },
        c: { type: 'terminal', lane: 'main', label: 'C', outcome: 'success' },
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    })

    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    const sw = parsed.nodes.sw as { cases: { when: unknown }[] }

    // All "when" values must remain strings, not coerced to booleans/null
    expect(sw.cases[0]?.when).toBe('true')
    expect(typeof sw.cases[0]?.when).toBe('string')
    expect(sw.cases[1]?.when).toBe('null')
    expect(typeof sw.cases[1]?.when).toBe('string')
    expect(sw.cases[2]?.when).toBe('yes')
    expect(typeof sw.cases[2]?.when).toBe('string')
  })

  it('yaml-reserved-in-node-metadata: reserved values in node metadata survive round-trip', () => {
    const doc = makeDoc({
      nodes: {
        a: {
          type: 'action',
          lane: 'main',
          label: 'A',
          metadata: {
            enabled: 'true',
            priority: '42',
            fallback: 'null',
            ready: 'yes',
            ratio: '3.14',
          },
          next: 'done',
        },
        done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
      },
    })

    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument
    const node = parsed.nodes.a as { metadata: Record<string, unknown> }

    expect(node.metadata.enabled).toBe('true')
    expect(typeof node.metadata.enabled).toBe('string')
    expect(node.metadata.priority).toBe('42')
    expect(typeof node.metadata.priority).toBe('string')
    expect(node.metadata.fallback).toBe('null')
    expect(typeof node.metadata.fallback).toBe('string')
    expect(node.metadata.ready).toBe('yes')
    expect(typeof node.metadata.ready).toBe('string')
    expect(node.metadata.ratio).toBe('3.14')
    expect(typeof node.metadata.ratio).toBe('string')
  })

  it('large-doc-roundtrip: 50+ node document survives serialize -> parse', () => {
    const nodes: Record<string, unknown> = {}
    const nodeCount = 55

    // Create a chain: a0 -> a1 -> a2 -> ... -> a54 (terminal)
    for (let i = 0; i < nodeCount - 1; i++) {
      nodes[`a${String(i)}`] = {
        type: 'action',
        lane: 'main',
        label: `Action ${String(i)}`,
        next: `a${String(i + 1)}`,
      }
    }
    nodes[`a${String(nodeCount - 1)}`] = {
      type: 'terminal',
      lane: 'main',
      label: 'End',
      outcome: 'success',
    }

    const doc = makeDoc({ nodes } as Partial<FlowprintDocument>)
    const yaml = serialize(doc)
    const parsed = parse(yaml) as FlowprintDocument

    expect(Object.keys(parsed.nodes)).toHaveLength(nodeCount)
    expect(parsed).toEqual(doc)

    // Verify idempotency
    const yaml2 = serialize(parsed)
    expect(yaml2).toBe(yaml)
  })
})
