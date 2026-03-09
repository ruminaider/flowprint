import { describe, it, expect } from 'vitest'
import { simulateGraph } from '@ruminaider/flowprint-engine/browser'
import type { RulesDocument } from '@ruminaider/flowprint-engine/browser'
import type { RulesDataMap } from '@ruminaider/flowprint-editor'
import { getTemplates, loadTemplate } from './templates'
import { getScenarios } from './template-scenarios'

function convertRulesData(map: RulesDataMap): Record<string, RulesDocument> {
  const result: Record<string, RulesDocument> = {}
  for (const [key, entry] of Object.entries(map)) {
    if (entry.data) {
      result[key] = entry.data as unknown as RulesDocument
    }
  }
  return result
}

describe('template scenarios e2e', () => {
  const templates = getTemplates()

  for (const tmpl of templates) {
    const doc = loadTemplate(tmpl.id)
    const docName = doc.name
    const scenarios = getScenarios(docName)

    if (scenarios.length === 0) continue

    describe(docName, () => {
      for (const scenario of scenarios) {
        it(`${scenario.id}: ${scenario.name}`, async () => {
          const trace = await simulateGraph(doc, {
            input: scenario.input,
            fixtures: scenario.fixtures,
            rulesData: scenario.rulesData ? convertRulesData(scenario.rulesData) : {},
          })

          // 1. No engine crash
          expect(
            trace.status,
            `Engine error: ${trace.error ?? 'unknown'}`,
          ).not.toBe('error')

          // 2. Produced steps
          expect(trace.steps.length).toBeGreaterThan(0)

          // 3. Last step is terminal
          const lastStep = trace.steps[trace.steps.length - 1]
          expect(lastStep?.type, 'Last step should be terminal').toBe('terminal')

          // 4. No switch fell through (no-match means missing fixture/case)
          const noMatchSteps = trace.steps.filter((s) => s.status === 'no-match')
          expect(
            noMatchSteps,
            `Switch nodes fell through: ${noMatchSteps.map((s) => s.node_id).join(', ')}`,
          ).toHaveLength(0)

          // 5. No unexpected errors (error-caught is OK)
          const errorSteps = trace.steps.filter(
            (s) => s.status === 'error' && s.type !== 'error',
          )
          expect(
            errorSteps,
            `Unexpected errors: ${errorSteps.map((s) => `${s.node_id}: ${s.error}`).join(', ')}`,
          ).toHaveLength(0)

          // 6. No infinite loops
          expect(
            trace.steps.length,
            `Possible infinite loop: ${trace.steps.length} steps`,
          ).toBeLessThan(50)
        })
      }
    })
  }
})
