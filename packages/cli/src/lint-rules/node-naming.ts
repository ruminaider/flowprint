import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { LintRule, LintResult } from './types.js'

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/

export const nodeNaming: LintRule = {
  name: 'node-naming',
  check(doc: FlowprintDocument): LintResult[] {
    const results: LintResult[] = []

    for (const nodeId of Object.keys(doc.nodes)) {
      if (!SNAKE_CASE.test(nodeId)) {
        results.push({
          rule: 'node-naming',
          path: `/nodes/${nodeId}`,
          message: `Node ID "${nodeId}" is not snake_case`,
        })
      }
    }

    return results
  },
}
