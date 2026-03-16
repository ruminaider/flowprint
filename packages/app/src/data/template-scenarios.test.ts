import { describe, it, expect } from 'vitest'
import { getScenarios } from './template-scenarios'

const TEMPLATE_NAMES = [
  'hello_world',
  'request_response',
  'approval_workflow',
  'order_routing',
  'parallel_pipeline',
  'ci_cd_pipeline',
  'patient_intake',
  'subscription_billing',
  'e_commerce_fulfillment',
  'insurance_claims',
]

// Load templates via the public API
import { getTemplates, loadTemplate } from './templates'

describe('template-scenarios', () => {
  it('every template has at least one scenario', () => {
    for (const name of TEMPLATE_NAMES) {
      const scenarios = getScenarios(name)
      expect(scenarios.length, `${name} should have scenarios`).toBeGreaterThanOrEqual(1)
    }
  })

  it('scenario IDs are unique within each template', () => {
    for (const name of TEMPLATE_NAMES) {
      const scenarios = getScenarios(name)
      const ids = scenarios.map((s) => s.id)
      expect(new Set(ids).size, `${name} has duplicate scenario IDs`).toBe(ids.length)
    }
  })

  it('every scenario has a valid input object', () => {
    for (const name of TEMPLATE_NAMES) {
      for (const scenario of getScenarios(name)) {
        expect(
          typeof scenario.input,
          `${name}/${scenario.id} input should be an object`,
        ).toBe('object')
        expect(scenario.input, `${name}/${scenario.id} input should not be null`).not.toBeNull()
      }
    }
  })

  it('returns empty array for unknown template', () => {
    expect(getScenarios('nonexistent_template')).toEqual([])
  })

  describe('rules file references match template YAML', () => {
    const templates = getTemplates()

    for (const tmpl of templates) {
      const doc = loadTemplate(tmpl.id)
      const docName = doc.name

      // Collect rules file refs from the template
      const rulesRefs = new Set<string>()
      for (const node of Object.values(doc.nodes)) {
        if ('rules' in node && node.rules && typeof node.rules === 'object' && 'file' in node.rules) {
          rulesRefs.add((node.rules as { file: string }).file)
        }
      }

      if (rulesRefs.size === 0) continue

      it(`${docName}: scenarios with rulesData cover all rules file refs`, () => {
        const scenarios = getScenarios(docName)
        // At least one scenario should provide rulesData for templates that use rules
        const scenariosWithRules = scenarios.filter((s) => s.rulesData && Object.keys(s.rulesData).length > 0)
        expect(
          scenariosWithRules.length,
          `${docName} should have at least one scenario with rulesData`,
        ).toBeGreaterThanOrEqual(1)

        // Check that all rules refs are covered by at least one scenario
        for (const ref of rulesRefs) {
          const covered = scenariosWithRules.some((s) => s.rulesData?.[ref])
          expect(covered, `${docName}: rules ref "${ref}" should be covered by a scenario`).toBe(true)
        }
      })
    }
  })

  describe('fixture node IDs reference real nodes in template', () => {
    const templates = getTemplates()

    for (const tmpl of templates) {
      const doc = loadTemplate(tmpl.id)
      const docName = doc.name
      const nodeIds = new Set(Object.keys(doc.nodes))
      const scenarios = getScenarios(docName)

      for (const scenario of scenarios) {
        if (!scenario.fixtures) continue

        it(`${docName}/${scenario.id}: fixture keys are valid node IDs`, () => {
          for (const fixtureKey of Object.keys(scenario.fixtures ?? {})) {
            expect(
              nodeIds.has(fixtureKey),
              `${docName}/${scenario.id}: fixture key "${fixtureKey}" is not a node in the template`,
            ).toBe(true)
          }
        })
      }
    }
  })
})
