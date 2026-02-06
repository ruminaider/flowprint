import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { runGraph } from '../../runner/walker.js'

const EXAMPLES_DIR = resolve(import.meta.dirname, '../../../../..', 'examples')

const STUBS_YAML = resolve(EXAMPLES_DIR, 'consultation-flow-v2-stubs.flowprint.yaml')
const FIXTURES_PATH = resolve(EXAMPLES_DIR, 'stubs/consultation/fixtures.json')

function loadStubsDoc(): FlowprintDocument {
  const content = readFileSync(STUBS_YAML, 'utf-8')
  return parse(content) as FlowprintDocument
}

function loadFixtures(): Record<string, unknown> {
  const content = readFileSync(FIXTURES_PATH, 'utf-8')
  return JSON.parse(content) as Record<string, unknown>
}

describe('e2e: consultation-flow-v2-stubs', () => {
  it('happy path — default triage routes through specialist to completion', async () => {
    const doc = loadStubsDoc()
    const fixtures = loadFixtures()

    const trace = await runGraph(doc, {
      input: { patient_id: 'P001', symptoms: ['headache'] },
      projectRoot: EXAMPLES_DIR,
      fixtures,
    })

    expect(trace.status).toBe('success')

    const nodeIds = trace.steps.map((s) => s.node_id)
    expect(nodeIds).toContain('initiate_consultation')
    expect(nodeIds).toContain('collect_intake')
    expect(nodeIds).toContain('triage_assessment')
    // Default route → route_specialist_consults → conduct_consultation
    expect(nodeIds).toContain('route_specialist_consults')
    expect(nodeIds).toContain('conduct_consultation')
    expect(nodeIds).toContain('determine_outcome')
    expect(nodeIds).toContain('consultation_complete')

    const terminal = trace.steps.find((s) => s.node_id === 'consultation_complete')
    expect(terminal?.outcome).toBe('success')
  })

  it('timeout path — urgent route with no provider fixture reaches scheduling_failed', async () => {
    const doc = loadStubsDoc()
    // No fixtures for await_provider_availability — triggers timeout_next

    const trace = await runGraph(doc, {
      input: { patient_id: 'P001', symptoms: ['headache'], urgency: 'urgent' },
      projectRoot: EXAMPLES_DIR,
    })

    expect(trace.status).toBe('failure')

    const nodeIds = trace.steps.map((s) => s.node_id)
    expect(nodeIds).toContain('initiate_consultation')
    expect(nodeIds).toContain('collect_intake')
    expect(nodeIds).toContain('triage_assessment')
    expect(nodeIds).toContain('urgent_consult')
    expect(nodeIds).toContain('await_provider_availability')
    expect(nodeIds).toContain('scheduling_failed')
    expect(nodeIds).toContain('consultation_incomplete')

    // Wait step should have timeout status
    const waitStep = trace.steps.find((s) => s.node_id === 'await_provider_availability')
    expect(waitStep?.status).toBe('timeout')
    expect(waitStep?.next).toBe('scheduling_failed')

    // Error handler entry_point should have been executed
    const errorStep = trace.steps.find((s) => s.node_id === 'scheduling_failed')
    expect(errorStep?.status).toBe('handled')

    const terminal = trace.steps.find((s) => s.node_id === 'consultation_incomplete')
    expect(terminal?.outcome).toBe('failure')
  })

  it('emergency path — routes directly to escalation and terminates', async () => {
    const doc = loadStubsDoc()

    const trace = await runGraph(doc, {
      input: { patient_id: 'P001', symptoms: ['chest_pain'], urgency: 'emergency' },
      projectRoot: EXAMPLES_DIR,
    })

    expect(trace.status).toBe('success')

    const nodeIds = trace.steps.map((s) => s.node_id)
    expect(nodeIds).toContain('initiate_consultation')
    expect(nodeIds).toContain('collect_intake')
    expect(nodeIds).toContain('triage_assessment')
    expect(nodeIds).toContain('escalate_emergency')
    expect(nodeIds).toContain('emergency_referral_complete')

    const terminal = trace.steps.find((s) => s.node_id === 'emergency_referral_complete')
    expect(terminal?.outcome).toBe('success')
  })
})
