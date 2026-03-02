/**
 * Renders a single condition cell in a decision table.
 * Shows an operator badge with formatted condition, or a wildcard dash.
 */

import type { Condition } from './shared'
import { formatCondition } from './shared'

export interface ConditionCellProps {
  condition: Condition | undefined
}

export function ConditionCell({ condition }: ConditionCellProps) {
  if (condition === undefined) {
    return (
      <td>
        <span className="fp-decision-table__wildcard">{'\u2014'}</span>
      </td>
    )
  }
  return (
    <td>
      <span className="fp-decision-table__operator-badge">
        {formatCondition(condition)}
      </span>
    </td>
  )
}
