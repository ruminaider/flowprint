import { describe, it, expect, vi } from 'vitest'
import { resolveClassifications } from '../../engine/classification.js'
import { redactRecord } from '../../engine/redaction.js'
import { FlowprintEngine } from '../../engine/engine.js'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { NodeExecutionRecord } from '../../walker/types.js'
import type { RedactionPolicy, DataClassification } from '../../engine/types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides: {
  lanes?: Record<string, { label: string; data_class?: string[] }>
  nodes?: Record<string, { type: string; lane: string; data_class?: string[] }>
}): FlowprintDocument {
  const lanes: Record<string, unknown> = {}
  for (const [id, lane] of Object.entries(overrides.lanes ?? {})) {
    lanes[id] = { label: lane.label, visibility: 'internal', order: 0, data_class: lane.data_class }
  }
  const nodes: Record<string, unknown> = {}
  for (const [id, node] of Object.entries(overrides.nodes ?? {})) {
    nodes[id] = { type: node.type, lane: node.lane, label: id, data_class: node.data_class }
  }
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes,
    nodes,
  } as unknown as FlowprintDocument
}

function makeRecord(nodeId: string, output: Record<string, unknown> = {}): NodeExecutionRecord {
  return {
    nodeId,
    type: 'action',
    lane: 'default',
    startedAt: 0,
    completedAt: 1,
    output,
    handler: 'native',
  }
}

// ---------------------------------------------------------------------------
// Classification resolution
// ---------------------------------------------------------------------------

describe('resolveClassifications', () => {
  it('returns node-level data_class when present', () => {
    const doc = makeDoc({
      lanes: { ops: { label: 'Ops' } },
      nodes: { collect_ssn: { type: 'action', lane: 'ops', data_class: ['pii'] } },
    })
    expect(resolveClassifications('collect_ssn', doc)).toEqual(['pii'])
  })

  it('inherits lane-level data_class when node has none', () => {
    const doc = makeDoc({
      lanes: { finance: { label: 'Finance', data_class: ['financial'] } },
      nodes: { charge_card: { type: 'action', lane: 'finance' } },
    })
    expect(resolveClassifications('charge_card', doc)).toEqual(['financial'])
  })

  it('node-level overrides lane-level', () => {
    const doc = makeDoc({
      lanes: { finance: { label: 'Finance', data_class: ['financial'] } },
      nodes: { collect_ssn: { type: 'action', lane: 'finance', data_class: ['pii'] } },
    })
    expect(resolveClassifications('collect_ssn', doc)).toEqual(['pii'])
  })

  it('returns empty array when neither node nor lane has data_class', () => {
    const doc = makeDoc({
      lanes: { ops: { label: 'Ops' } },
      nodes: { process: { type: 'action', lane: 'ops' } },
    })
    expect(resolveClassifications('process', doc)).toEqual([])
  })

  it('returns empty array for unknown node', () => {
    const doc = makeDoc({
      lanes: { ops: { label: 'Ops' } },
      nodes: {},
    })
    expect(resolveClassifications('nonexistent', doc)).toEqual([])
  })

  it('returns node-level data_class with multiple classifications', () => {
    const doc = makeDoc({
      lanes: { ops: { label: 'Ops' } },
      nodes: {
        sensitive_op: { type: 'action', lane: 'ops', data_class: ['pii', 'credentials'] },
      },
    })
    expect(resolveClassifications('sensitive_op', doc)).toEqual(['pii', 'credentials'])
  })

  it('treats empty node data_class as absent (falls back to lane)', () => {
    const doc = makeDoc({
      lanes: { finance: { label: 'Finance', data_class: ['financial'] } },
      nodes: { charge_card: { type: 'action', lane: 'finance', data_class: [] } },
    })
    expect(resolveClassifications('charge_card', doc)).toEqual(['financial'])
  })
})

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

describe('redactRecord', () => {
  it('returns record unchanged when no classifications', () => {
    const record = makeRecord('node_a', { secret: 'value' })
    const result = redactRecord(record, [], { pii: 'redact' })
    expect(result).toBe(record)
  })

  it('redacts output when classification matches policy', () => {
    const record = makeRecord('node_a', { ssn: '123-45-6789' })
    const result = redactRecord(record, ['pii'], { pii: 'redact' })
    expect(result.output).toEqual({ __redacted: true })
    expect(result.nodeId).toBe('node_a')
    expect(result.type).toBe('action')
    expect(result.lane).toBe('default')
  })

  it('preserves output when classification is visible', () => {
    const record = makeRecord('node_a', { ssn: '123-45-6789' })
    const result = redactRecord(record, ['pii'], { pii: 'visible' })
    expect(result.output).toEqual({ ssn: '123-45-6789' })
  })

  it('preserves output when classification is not in policy', () => {
    const record = makeRecord('node_a', { data: 'value' })
    const result = redactRecord(record, ['pii'], {})
    expect(result.output).toEqual({ data: 'value' })
  })

  it('redacts when any classification matches (multiple classifications)', () => {
    const record = makeRecord('node_a', { data: 'value' })
    const policy: RedactionPolicy = { pii: 'redact', financial: 'visible' }
    const result = redactRecord(record, ['pii', 'financial'], policy)
    expect(result.output).toEqual({ __redacted: true })
  })

  it('preserves when all classifications are visible', () => {
    const record = makeRecord('node_a', { data: 'value' })
    const policy: RedactionPolicy = { pii: 'visible', financial: 'visible' }
    const result = redactRecord(record, ['pii', 'financial'], policy)
    expect(result.output).toEqual({ data: 'value' })
  })

  it('preserves error field even when redacting', () => {
    const record: NodeExecutionRecord = {
      ...makeRecord('node_a', { secret: 'data' }),
      error: { message: 'failed' },
    }
    const result = redactRecord(record, ['pii'], { pii: 'redact' })
    expect(result.output).toEqual({ __redacted: true })
    expect(result.error).toEqual({ message: 'failed' })
  })

  it('preserves timing fields when redacting', () => {
    const record = makeRecord('node_a', { secret: 'data' })
    record.startedAt = 100
    record.completedAt = 200
    const result = redactRecord(record, ['credentials'], { credentials: 'redact' })
    expect(result.startedAt).toBe(100)
    expect(result.completedAt).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Trace-level integration with engine
// ---------------------------------------------------------------------------

const SIMPLE_FLOW = `
schema: flowprint/1.0
name: test-flow
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: process
  process:
    type: action
    lane: default
    label: Process
    expressions:
      result: "input.x + 1"
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

const PII_FLOW = `
schema: flowprint/1.0
name: pii-flow
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: collect_data
  collect_data:
    type: action
    lane: default
    label: Collect Data
    data_class:
      - pii
    expressions:
      ssn: "'123-45-6789'"
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

const LANE_CLASSIFIED_FLOW = `
schema: flowprint/1.0
name: lane-classified-flow
version: "1.0.0"
lanes:
  secure:
    label: Secure Lane
    visibility: internal
    order: 0
    data_class:
      - financial
nodes:
  start:
    type: trigger
    lane: secure
    label: Start
    trigger_type: manual
    manual: {}
    next: charge
  charge:
    type: action
    lane: secure
    label: Charge Card
    expressions:
      amount: "input.amount"
    next: done
  done:
    type: terminal
    lane: secure
    label: Done
    outcome: success
`

describe('traceLevel integration', () => {
  describe('traceLevel: full', () => {
    it('preserves all output in trace', async () => {
      const engine = new FlowprintEngine({ traceLevel: 'full' })
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ ssn: '123-45-6789' })
    })
  })

  describe('traceLevel: policy', () => {
    it('redacts output for PII node when policy says redact', async () => {
      const engine = new FlowprintEngine({
        traceLevel: 'policy',
        redactionPolicy: { pii: 'redact' },
      })
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ __redacted: true })
    })

    it('preserves output for PII node when policy says visible', async () => {
      const engine = new FlowprintEngine({
        traceLevel: 'policy',
        redactionPolicy: { pii: 'visible' },
      })
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ ssn: '123-45-6789' })
    })

    it('does not redact unclassified nodes', async () => {
      const engine = new FlowprintEngine({
        traceLevel: 'policy',
        redactionPolicy: { pii: 'redact' },
      })
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({ x: 5 })

      const processRecord = result.trace.find((r) => r.nodeId === 'process')
      expect(processRecord).toBeDefined()
      expect(processRecord!.output).toEqual({ result: 6 })
    })

    it('no redaction when policy is empty', async () => {
      const engine = new FlowprintEngine({
        traceLevel: 'policy',
        redactionPolicy: {},
      })
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ ssn: '123-45-6789' })
    })

    it('no redaction when no policy provided', async () => {
      const engine = new FlowprintEngine({ traceLevel: 'policy' })
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ ssn: '123-45-6789' })
    })
  })

  describe('traceLevel: none', () => {
    it('produces empty trace array', async () => {
      const engine = new FlowprintEngine({ traceLevel: 'none' })
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({ x: 5 })

      expect(result.trace).toEqual([])
    })

    it('still produces correct output', async () => {
      const engine = new FlowprintEngine({ traceLevel: 'none' })
      const flow = await engine.load(SIMPLE_FLOW)
      const result = await flow.execute({ x: 5 })

      expect(result.output).toBeDefined()
      expect(result.outcome).toBe('success')
    })
  })

  describe('default traceLevel', () => {
    it('defaults to full (no redaction)', async () => {
      const engine = new FlowprintEngine()
      const flow = await engine.load(PII_FLOW)
      const result = await flow.execute({ x: 1 })

      const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
      expect(collectRecord).toBeDefined()
      expect(collectRecord!.output).toEqual({ ssn: '123-45-6789' })
    })
  })
})

// ---------------------------------------------------------------------------
// Multiple classifications
// ---------------------------------------------------------------------------

describe('multiple classifications', () => {
  const MULTI_CLASS_FLOW = `
schema: flowprint/1.0
name: multi-class-flow
version: "1.0.0"
lanes:
  default:
    label: Default
    visibility: internal
    order: 0
nodes:
  start:
    type: trigger
    lane: default
    label: Start
    trigger_type: manual
    manual: {}
    next: sensitive
  sensitive:
    type: action
    lane: default
    label: Sensitive Op
    data_class:
      - pii
      - financial
    expressions:
      data: "'secret'"
    next: done
  done:
    type: terminal
    lane: default
    label: Done
    outcome: success
`

  it('redacts when any one classification triggers redaction', async () => {
    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { pii: 'redact', financial: 'visible' },
    })
    const flow = await engine.load(MULTI_CLASS_FLOW)
    const result = await flow.execute({})

    const record = result.trace.find((r) => r.nodeId === 'sensitive')
    expect(record!.output).toEqual({ __redacted: true })
  })

  it('preserves when all classifications are visible', async () => {
    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { pii: 'visible', financial: 'visible' },
    })
    const flow = await engine.load(MULTI_CLASS_FLOW)
    const result = await flow.execute({})

    const record = result.trace.find((r) => r.nodeId === 'sensitive')
    expect(record!.output).toEqual({ data: 'secret' })
  })
})

// ---------------------------------------------------------------------------
// Custom redactTrace hook
// ---------------------------------------------------------------------------

describe('custom redactTrace hook', () => {
  it('receives record and returns modified record', async () => {
    const customRedact = vi.fn(
      (record: NodeExecutionRecord): NodeExecutionRecord => ({
        ...record,
        output: { __custom_redacted: true, nodeId: record.nodeId },
      }),
    )

    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactTrace: customRedact,
    })
    const flow = await engine.load(PII_FLOW)
    const result = await flow.execute({ x: 1 })

    // Custom hook should be called for every node (trigger, action, terminal)
    expect(customRedact).toHaveBeenCalled()

    const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
    expect(collectRecord!.output).toEqual({
      __custom_redacted: true,
      nodeId: 'collect_data',
    })
  })

  it('takes precedence over built-in redaction', async () => {
    const customRedact = vi.fn(
      (record: NodeExecutionRecord): NodeExecutionRecord => ({
        ...record,
        output: { custom: true },
      }),
    )

    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { pii: 'redact' },
      redactTrace: customRedact,
    })
    const flow = await engine.load(PII_FLOW)
    const result = await flow.execute({ x: 1 })

    const collectRecord = result.trace.find((r) => r.nodeId === 'collect_data')
    // Custom hook wins over built-in redaction
    expect(collectRecord!.output).toEqual({ custom: true })
  })

  it('is not called when traceLevel is full', async () => {
    const customRedact = vi.fn((record: NodeExecutionRecord) => record)

    const engine = new FlowprintEngine({
      traceLevel: 'full',
      redactTrace: customRedact,
    })
    const flow = await engine.load(PII_FLOW)
    await flow.execute({ x: 1 })

    expect(customRedact).not.toHaveBeenCalled()
  })

  it('is not called when traceLevel is none', async () => {
    const customRedact = vi.fn((record: NodeExecutionRecord) => record)

    const engine = new FlowprintEngine({
      traceLevel: 'none',
      redactTrace: customRedact,
    })
    const flow = await engine.load(PII_FLOW)
    await flow.execute({ x: 1 })

    expect(customRedact).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Lane inheritance integration
// ---------------------------------------------------------------------------

describe('lane inheritance integration', () => {
  it('redacts nodes inheriting lane classification', async () => {
    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { financial: 'redact' },
    })
    const flow = await engine.load(LANE_CLASSIFIED_FLOW)
    const result = await flow.execute({ amount: 99.99 })

    const chargeRecord = result.trace.find((r) => r.nodeId === 'charge')
    expect(chargeRecord).toBeDefined()
    expect(chargeRecord!.output).toEqual({ __redacted: true })
  })

  it('preserves nodes inheriting lane classification when policy is visible', async () => {
    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { financial: 'visible' },
    })
    const flow = await engine.load(LANE_CLASSIFIED_FLOW)
    const result = await flow.execute({ amount: 99.99 })

    const chargeRecord = result.trace.find((r) => r.nodeId === 'charge')
    expect(chargeRecord).toBeDefined()
    expect(chargeRecord!.output).toEqual({ amount: 99.99 })
  })

  it('node classification overrides lane in integration', async () => {
    const MIXED_FLOW = `
schema: flowprint/1.0
name: mixed-flow
version: "1.0.0"
lanes:
  secure:
    label: Secure Lane
    visibility: internal
    order: 0
    data_class:
      - financial
nodes:
  start:
    type: trigger
    lane: secure
    label: Start
    trigger_type: manual
    manual: {}
    next: process
  process:
    type: action
    lane: secure
    label: Process
    data_class:
      - pii
    expressions:
      data: "'sensitive'"
    next: done
  done:
    type: terminal
    lane: secure
    label: Done
    outcome: success
`
    // Node has pii, lane has financial. Policy only redacts financial.
    // Node classification (pii) takes precedence, so financial policy doesn't apply.
    const engine = new FlowprintEngine({
      traceLevel: 'policy',
      redactionPolicy: { financial: 'redact', pii: 'visible' },
    })
    const flow = await engine.load(MIXED_FLOW)
    const result = await flow.execute({})

    const processRecord = result.trace.find((r) => r.nodeId === 'process')
    expect(processRecord).toBeDefined()
    // Node overrides lane: node is pii (visible), not financial (redact)
    expect(processRecord!.output).toEqual({ data: 'sensitive' })
  })
})
