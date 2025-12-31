import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { LintRule, LintResult } from './types.js'

export const laneOrdering: LintRule = {
  name: 'lane-ordering',
  check(doc: FlowprintDocument): LintResult[] {
    const results: LintResult[] = []

    const lanes = Object.entries(doc.lanes).sort(([, a], [, b]) => a.order - b.order)

    let seenInternal = false
    for (const [laneId, lane] of lanes) {
      if (lane.visibility === 'internal') {
        seenInternal = true
      } else if (lane.visibility === 'external' && seenInternal) {
        results.push({
          rule: 'lane-ordering',
          path: `/lanes/${laneId}`,
          message: `External lane "${laneId}" (order ${lane.order}) appears after internal lanes`,
        })
      }
    }

    return results
  },
}
