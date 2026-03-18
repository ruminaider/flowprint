import { describe, it, expect } from 'vitest'
import { migrate, buildMigrationPath } from '../migrate.js'
import type { FlowprintDocument, MigrationRule, Transform } from '../types.js'

function makeDoc(schemaVersion = 'flowprint/1.0'): FlowprintDocument {
  return {
    schema: schemaVersion,
    name: 'test',
    version: '1.0.0',
    lanes: { main: { label: 'Main', visibility: 'external', order: 0 } },
    nodes: {
      start: {
        type: 'trigger',
        lane: 'main',
        label: 'Start',
        trigger_type: 'manual',
        manual: {},
        next: 'done',
      },
      step1: { type: 'action', lane: 'main', label: 'Step', next: 'done' },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
  } as FlowprintDocument
}

const permissiveSchema = {
  type: 'object',
  required: ['schema', 'name', 'version', 'lanes', 'nodes'],
  properties: {
    schema: { type: 'string' },
    name: { type: 'string' },
    version: { type: 'string' },
    lanes: { type: 'object' },
    nodes: { type: 'object' },
  },
}

describe('migrate', () => {
  describe('status: current', () => {
    it('returns current when doc is at CURRENT_VERSION', () => {
      const doc = makeDoc('flowprint/1.0')
      const result = migrate(doc, { currentVersion: 'flowprint/1.0' })
      expect(result.status).toBe('current')
      expect(result).toEqual({ status: 'current', doc })
    })
  })

  describe('status: future_version', () => {
    it('returns future_version when doc version > current', () => {
      const doc = makeDoc('flowprint/2.0')
      const result = migrate(doc, { currentVersion: 'flowprint/1.0', rules: [] })
      expect(result.status).toBe('future_version')
      if (result.status === 'future_version') {
        expect(result.documentVersion).toBe('flowprint/2.0')
        expect(result.currentToolVersion).toBe('flowprint/1.0')
        expect(result.doc).toEqual(doc)
      }
    })
  })

  describe('status: migrated', () => {
    it('applies migration and returns migrated result', () => {
      const doc = makeDoc('flowprint/1.0')
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Add priority field to all nodes',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'priority', value: 'normal' } as Transform,
          ],
        },
      ]
      const schemas: Record<string, object> = {
        'flowprint/1.1': permissiveSchema,
      }
      const result = migrate(doc, {
        rules,
        schemas,
        currentVersion: 'flowprint/1.1',
      })
      expect(result.status).toBe('migrated')
      if (result.status === 'migrated') {
        expect(result.doc.schema).toBe('flowprint/1.1')
        expect(result.fromVersion).toBe('flowprint/1.0')
        expect(result.toVersion).toBe('flowprint/1.1')
        expect(result.changelog.from).toBe('flowprint/1.0')
        expect(result.changelog.to).toBe('flowprint/1.1')
        expect(result.changelog.entries).toHaveLength(1)
        expect(result.changelog.entries[0]!.version).toBe('flowprint/1.1')
        expect(result.changelog.entries[0]!.description).toBe('Add priority field to all nodes')
        // Verify the transform was applied
        const nodes = result.doc.nodes as Record<string, Record<string, unknown>>
        for (const node of Object.values(nodes)) {
          expect(node.priority).toBe('normal')
        }
      }
    })

    it('does not mutate the original document', () => {
      const doc = makeDoc('flowprint/1.0')
      const originalSchema = doc.schema
      const originalNodeKeys = Object.keys(doc.nodes)
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Add priority field',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'priority', value: 'normal' } as Transform,
          ],
        },
      ]
      const schemas: Record<string, object> = {
        'flowprint/1.1': permissiveSchema,
      }
      migrate(doc, { rules, schemas, currentVersion: 'flowprint/1.1' })

      // Original document should be unchanged
      expect(doc.schema).toBe(originalSchema)
      expect(Object.keys(doc.nodes)).toEqual(originalNodeKeys)
      for (const node of Object.values(doc.nodes)) {
        expect((node as Record<string, unknown>).priority).toBeUndefined()
      }
    })

    it('applies multi-step chain in sequence (1.0 -> 1.1 -> 1.2)', () => {
      const doc = makeDoc('flowprint/1.0')
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Step 1: add priority',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'priority', value: 'normal' } as Transform,
          ],
        },
        {
          from: 'flowprint/1.1',
          to: 'flowprint/1.2',
          required: false,
          notable: true,
          description: 'Step 2: add tags',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'tags', value: [] } as Transform,
          ],
        },
      ]
      const schemas: Record<string, object> = {
        'flowprint/1.1': permissiveSchema,
        'flowprint/1.2': permissiveSchema,
      }
      const result = migrate(doc, {
        rules,
        schemas,
        currentVersion: 'flowprint/1.2',
      })
      expect(result.status).toBe('migrated')
      if (result.status === 'migrated') {
        expect(result.doc.schema).toBe('flowprint/1.2')
        expect(result.fromVersion).toBe('flowprint/1.0')
        expect(result.toVersion).toBe('flowprint/1.2')
        expect(result.changelog.entries).toHaveLength(2)
        expect(result.changelog.entries[0]!.version).toBe('flowprint/1.1')
        expect(result.changelog.entries[1]!.version).toBe('flowprint/1.2')
        // Both transforms applied
        const nodes = result.doc.nodes as Record<string, Record<string, unknown>>
        for (const node of Object.values(nodes)) {
          expect(node.priority).toBe('normal')
          expect(node.tags).toEqual([])
        }
      }
    })

    it('executes custom transform after declarative transforms', () => {
      const doc = makeDoc('flowprint/1.0')
      const executionOrder: string[] = []
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Custom after declarative',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'priority', value: 'normal' } as Transform,
          ],
          custom: (d: FlowprintDocument) => {
            // At this point, declarative transforms should have already been applied
            const nodes = d.nodes as Record<string, Record<string, unknown>>
            const firstNode = Object.values(nodes)[0]
            if (firstNode?.priority === 'normal') {
              executionOrder.push('custom_after_declarative')
            }
            // Custom transform modifies the doc further
            ;(d as unknown as Record<string, unknown>).description = 'Modified by custom'
            return d
          },
        },
      ]
      const schemas: Record<string, object> = {
        'flowprint/1.1': permissiveSchema,
      }
      const result = migrate(doc, {
        rules,
        schemas,
        currentVersion: 'flowprint/1.1',
      })
      expect(result.status).toBe('migrated')
      if (result.status === 'migrated') {
        expect(executionOrder).toEqual(['custom_after_declarative'])
        expect(result.doc.description).toBe('Modified by custom')
      }
    })
  })

  describe('status: error', () => {
    it('returns error when custom transform throws', () => {
      const doc = makeDoc('flowprint/1.0')
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Throws error',
          transforms: [],
          custom: () => {
            throw new Error('Custom transform failed!')
          },
        },
      ]
      const result = migrate(doc, {
        rules,
        schemas: { 'flowprint/1.1': permissiveSchema },
        currentVersion: 'flowprint/1.1',
      })
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error.reason).toContain('Custom transform failed!')
        expect(result.error.failedRule).toBe('flowprint/1.0 \u2192 flowprint/1.1')
        expect(result.error.stepIndex).toBe(0)
        expect(result.originalDoc).toEqual(doc)
      }
    })

    it('returns error when per-step validation fails', () => {
      const doc = makeDoc('flowprint/1.0')
      // Rule that removes 'type' from all nodes
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Remove type field',
          transforms: [{ type: 'removeField', scope: 'nodes', field: 'type' } as Transform],
        },
      ]
      // Strict schema that requires 'type' on every node
      const strictSchema = {
        type: 'object',
        required: ['schema', 'name', 'version', 'lanes', 'nodes'],
        properties: {
          schema: { type: 'string' },
          name: { type: 'string' },
          version: { type: 'string' },
          lanes: { type: 'object' },
          nodes: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string' },
              },
            },
          },
        },
      }
      const result = migrate(doc, {
        rules,
        schemas: { 'flowprint/1.1': strictSchema },
        currentVersion: 'flowprint/1.1',
      })
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error.reason).toContain('Per-step validation failed')
        expect(result.error.failedRule).toBe('flowprint/1.0 \u2192 flowprint/1.1')
        expect(result.error.stepIndex).toBe(0)
        expect(result.originalDoc).toEqual(doc)
      }
    })

    it('returns error when no migration path exists', () => {
      const doc = makeDoc('flowprint/1.0')
      const result = migrate(doc, {
        rules: [],
        schemas: {},
        currentVersion: 'flowprint/1.5',
      })
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error.reason).toContain('No migration path found')
        expect(result.error.stepIndex).toBe(-1)
        expect(result.originalDoc).toEqual(doc)
      }
    })

    it('stops at first failing step and returns original document', () => {
      const doc = makeDoc('flowprint/1.0')
      const rules: MigrationRule[] = [
        {
          from: 'flowprint/1.0',
          to: 'flowprint/1.1',
          required: true,
          notable: false,
          description: 'Step 1: succeeds',
          transforms: [
            { type: 'addField', scope: 'nodes', field: 'priority', value: 'normal' } as Transform,
          ],
        },
        {
          from: 'flowprint/1.1',
          to: 'flowprint/1.2',
          required: true,
          notable: false,
          description: 'Step 2: fails',
          transforms: [],
          custom: () => {
            throw new Error('Step 2 exploded')
          },
        },
      ]
      const schemas: Record<string, object> = {
        'flowprint/1.1': permissiveSchema,
        'flowprint/1.2': permissiveSchema,
      }
      const result = migrate(doc, {
        rules,
        schemas,
        currentVersion: 'flowprint/1.2',
      })
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error.stepIndex).toBe(1)
        expect(result.error.failedRule).toBe('flowprint/1.1 \u2192 flowprint/1.2')
        expect(result.error.reason).toContain('Step 2 exploded')
        // Returns the original (unmutated) document, not the partially migrated one
        expect(result.originalDoc).toEqual(doc)
        expect(result.originalDoc.schema).toBe('flowprint/1.0')
      }
    })
  })
})

describe('buildMigrationPath', () => {
  const rules: MigrationRule[] = [
    {
      from: 'flowprint/1.0',
      to: 'flowprint/1.1',
      required: true,
      notable: false,
      description: 'v1.0 to v1.1',
      transforms: [],
    },
    {
      from: 'flowprint/1.1',
      to: 'flowprint/1.2',
      required: true,
      notable: false,
      description: 'v1.1 to v1.2',
      transforms: [],
    },
    {
      from: 'flowprint/1.2',
      to: 'flowprint/1.3',
      required: false,
      notable: true,
      description: 'v1.2 to v1.3',
      transforms: [],
    },
  ]

  it('finds single-step path', () => {
    const path = buildMigrationPath('flowprint/1.0', 'flowprint/1.1', rules)
    expect(path).toHaveLength(1)
    expect(path[0]!.from).toBe('flowprint/1.0')
    expect(path[0]!.to).toBe('flowprint/1.1')
  })

  it('finds multi-step path', () => {
    const path = buildMigrationPath('flowprint/1.0', 'flowprint/1.3', rules)
    expect(path).toHaveLength(3)
    expect(path[0]!.from).toBe('flowprint/1.0')
    expect(path[0]!.to).toBe('flowprint/1.1')
    expect(path[1]!.from).toBe('flowprint/1.1')
    expect(path[1]!.to).toBe('flowprint/1.2')
    expect(path[2]!.from).toBe('flowprint/1.2')
    expect(path[2]!.to).toBe('flowprint/1.3')
  })

  it('returns empty array when no path exists', () => {
    const path = buildMigrationPath('flowprint/1.5', 'flowprint/1.6', rules)
    expect(path).toEqual([])
  })

  it('returns empty array when from === to', () => {
    const path = buildMigrationPath('flowprint/1.0', 'flowprint/1.0', rules)
    expect(path).toEqual([])
  })
})
