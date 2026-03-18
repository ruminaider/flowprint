import { describe, it, expect } from 'vitest'
import { applyTransform, describeTransform } from '../transforms.js'
import type { FlowprintDocument, Transform } from '../types.js'

function makeDoc(
  nodeOverrides?: Record<string, Record<string, unknown>>,
): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
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
        next: 'step1',
      },
      step1: {
        type: 'action',
        lane: 'main',
        label: 'Step 1',
        next: 'done',
        ...nodeOverrides?.step1,
      },
      wait1: {
        type: 'wait',
        lane: 'main',
        label: 'Wait',
        event: 'timer',
        next: 'done',
        ...nodeOverrides?.wait1,
      },
      done: { type: 'terminal', lane: 'main', label: 'Done', outcome: 'success' },
    },
  } as FlowprintDocument
}

describe('applyTransform', () => {
  describe('addField', () => {
    it('adds field to all nodes when no nodeType filter', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'addField',
        scope: 'nodes',
        field: 'priority',
        value: 'normal',
      }
      const result = applyTransform(doc, transform)
      for (const node of Object.values(result.nodes)) {
        expect((node as Record<string, unknown>).priority).toBe('normal')
      }
    })

    it('adds field only to matching nodeType', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'addField',
        scope: 'nodes',
        nodeType: 'action',
        field: 'retries',
        value: 3,
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).retries).toBe(3)
      expect((result.nodes.start as Record<string, unknown>).retries).toBeUndefined()
      expect((result.nodes.wait1 as Record<string, unknown>).retries).toBeUndefined()
      expect((result.nodes.done as Record<string, unknown>).retries).toBeUndefined()
    })

    it('does not overwrite existing field', () => {
      const doc = makeDoc({ step1: { priority: 'high' } })
      const transform: Transform = {
        type: 'addField',
        scope: 'nodes',
        field: 'priority',
        value: 'normal',
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).priority).toBe('high')
    })

    it('adds field to metadata scope', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'addField',
        scope: 'metadata',
        field: 'owner',
        value: 'team-a',
      }
      const result = applyTransform(doc, transform)
      expect((result.metadata as Record<string, unknown>).owner).toBe('team-a')
    })

    it('creates metadata object if absent', () => {
      const doc = makeDoc()
      delete (doc as unknown as Record<string, unknown>).metadata
      const transform: Transform = {
        type: 'addField',
        scope: 'metadata',
        field: 'version_policy',
        value: 'strict',
      }
      const result = applyTransform(doc, transform)
      expect(result.metadata).toBeDefined()
      expect((result.metadata as Record<string, unknown>).version_policy).toBe('strict')
    })
  })

  describe('removeField', () => {
    it('removes field from filtered nodes', () => {
      const doc = makeDoc({ step1: { deprecated: true }, wait1: { deprecated: true } })
      const transform: Transform = {
        type: 'removeField',
        scope: 'nodes',
        nodeType: 'action',
        field: 'deprecated',
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).deprecated).toBeUndefined()
      // wait1 is type 'wait', so it should not be affected
      expect((result.nodes.wait1 as Record<string, unknown>).deprecated).toBe(true)
    })

    it('removes field from metadata', () => {
      const doc = makeDoc()
      ;(doc as unknown as Record<string, unknown>).metadata = { legacy: 'yes', owner: 'team-a' }
      const transform: Transform = {
        type: 'removeField',
        scope: 'metadata',
        field: 'legacy',
      }
      const result = applyTransform(doc, transform)
      expect((result.metadata as Record<string, unknown>).legacy).toBeUndefined()
      expect((result.metadata as Record<string, unknown>).owner).toBe('team-a')
    })

    it('is a no-op if field does not exist', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'removeField',
        scope: 'nodes',
        field: 'nonexistent',
      }
      const result = applyTransform(doc, transform)
      // Should not throw, nodes remain unchanged
      expect(result.nodes.step1).toBeDefined()
    })
  })

  describe('renameField', () => {
    it('renames field on matching nodes', () => {
      const doc = makeDoc({ step1: { timeout: 30 } })
      const transform: Transform = {
        type: 'renameField',
        scope: 'nodes',
        nodeType: 'action',
        from: 'timeout',
        to: 'timeout_seconds',
      }
      const result = applyTransform(doc, transform)
      const step1 = result.nodes.step1 as Record<string, unknown>
      expect(step1.timeout_seconds).toBe(30)
      expect(step1.timeout).toBeUndefined()
    })

    it('skips nodes that do not have the field', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'renameField',
        scope: 'nodes',
        from: 'nonexistent',
        to: 'new_name',
      }
      const result = applyTransform(doc, transform)
      // Should not throw, no field to rename
      for (const node of Object.values(result.nodes)) {
        expect((node as Record<string, unknown>).new_name).toBeUndefined()
      }
    })

    it('renames field in metadata', () => {
      const doc = makeDoc()
      ;(doc as unknown as Record<string, unknown>).metadata = { old_key: 'value' }
      const transform: Transform = {
        type: 'renameField',
        scope: 'metadata',
        from: 'old_key',
        to: 'new_key',
      }
      const result = applyTransform(doc, transform)
      const meta = result.metadata as Record<string, unknown>
      expect(meta.new_key).toBe('value')
      expect(meta.old_key).toBeUndefined()
    })
  })

  describe('renameNodeType', () => {
    it('renames matching node types', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'renameNodeType',
        from: 'action',
        to: 'task',
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).type).toBe('task')
    })

    it('leaves non-matching node types unchanged', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'renameNodeType',
        from: 'action',
        to: 'task',
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.start as Record<string, unknown>).type).toBe('trigger')
      expect((result.nodes.wait1 as Record<string, unknown>).type).toBe('wait')
      expect((result.nodes.done as Record<string, unknown>).type).toBe('terminal')
    })
  })

  describe('setDefault', () => {
    it('sets value when field is missing', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'setDefault',
        scope: 'nodes',
        nodeType: 'action',
        field: 'retries',
        value: 0,
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).retries).toBe(0)
    })

    it('sets value when field is null', () => {
      const doc = makeDoc({ step1: { retries: null } })
      const transform: Transform = {
        type: 'setDefault',
        scope: 'nodes',
        nodeType: 'action',
        field: 'retries',
        value: 0,
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).retries).toBe(0)
    })

    it('skips when field already has a value', () => {
      const doc = makeDoc({ step1: { retries: 5 } })
      const transform: Transform = {
        type: 'setDefault',
        scope: 'nodes',
        nodeType: 'action',
        field: 'retries',
        value: 0,
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).retries).toBe(5)
    })

    it('sets default in metadata scope', () => {
      const doc = makeDoc()
      ;(doc as unknown as Record<string, unknown>).metadata = {}
      const transform: Transform = {
        type: 'setDefault',
        scope: 'metadata',
        field: 'env',
        value: 'production',
      }
      const result = applyTransform(doc, transform)
      expect((result.metadata as Record<string, unknown>).env).toBe('production')
    })
  })

  describe('changeFieldType', () => {
    it('converts field using provided function', () => {
      const doc = makeDoc({ step1: { timeout: '30' }, wait1: { timeout: '60' } })
      const transform: Transform = {
        type: 'changeFieldType',
        scope: 'nodes',
        field: 'timeout',
        convert: (v) => Number(v),
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).timeout).toBe(30)
      expect((result.nodes.wait1 as Record<string, unknown>).timeout).toBe(60)
    })

    it('only converts matching nodeType when specified', () => {
      const doc = makeDoc({ step1: { timeout: '30' }, wait1: { timeout: '60' } })
      const transform: Transform = {
        type: 'changeFieldType',
        scope: 'nodes',
        nodeType: 'action',
        field: 'timeout',
        convert: (v) => Number(v),
      }
      const result = applyTransform(doc, transform)
      expect((result.nodes.step1 as Record<string, unknown>).timeout).toBe(30)
      // wait1 is not 'action', should remain a string
      expect((result.nodes.wait1 as Record<string, unknown>).timeout).toBe('60')
    })

    it('skips nodes that do not have the field', () => {
      const doc = makeDoc()
      const transform: Transform = {
        type: 'changeFieldType',
        scope: 'nodes',
        field: 'nonexistent',
        convert: (v) => String(v),
      }
      // Should not throw
      const result = applyTransform(doc, transform)
      expect(result.nodes.step1).toBeDefined()
    })
  })
})

describe('describeTransform', () => {
  it('describes addField', () => {
    const t: Transform = {
      type: 'addField',
      scope: 'nodes',
      field: 'priority',
      value: 'normal',
    }
    expect(describeTransform(t)).toBe('Added "priority" field to nodes')
  })

  it('describes addField with nodeType', () => {
    const t: Transform = {
      type: 'addField',
      scope: 'nodes',
      nodeType: 'action',
      field: 'retries',
      value: 3,
    }
    expect(describeTransform(t)).toBe('Added "retries" field to action nodes')
  })

  it('describes removeField', () => {
    const t: Transform = {
      type: 'removeField',
      scope: 'metadata',
      field: 'legacy',
    }
    expect(describeTransform(t)).toBe('Removed "legacy" field from metadata')
  })

  it('describes renameField', () => {
    const t: Transform = {
      type: 'renameField',
      scope: 'nodes',
      nodeType: 'wait',
      from: 'timeout',
      to: 'timeout_seconds',
    }
    expect(describeTransform(t)).toBe(
      'Renamed "timeout" to "timeout_seconds" in wait nodes',
    )
  })

  it('describes renameNodeType', () => {
    const t: Transform = { type: 'renameNodeType', from: 'action', to: 'task' }
    expect(describeTransform(t)).toBe('Renamed node type "action" to "task"')
  })

  it('describes setDefault', () => {
    const t: Transform = {
      type: 'setDefault',
      scope: 'nodes',
      field: 'retries',
      value: 0,
    }
    expect(describeTransform(t)).toBe('Set default "retries" = 0 in nodes')
  })

  it('describes changeFieldType', () => {
    const t: Transform = {
      type: 'changeFieldType',
      scope: 'nodes',
      field: 'timeout',
      convert: (v) => Number(v),
    }
    expect(describeTransform(t)).toBe('Converted "timeout" field type in nodes')
  })

  it('describes changeFieldType with nodeType', () => {
    const t: Transform = {
      type: 'changeFieldType',
      scope: 'nodes',
      nodeType: 'action',
      field: 'timeout',
      convert: (v) => Number(v),
    }
    expect(describeTransform(t)).toBe('Converted "timeout" field type in action nodes')
  })
})
