/**
 * Read-only decision table grid component.
 *
 * Renders a tabular view of a rules document: condition columns (inputs),
 * output columns (from `then`), rows for each rule, operator badges,
 * wildcard indicators, and a hit policy badge.
 *
 * Composes shared sub-components from `./decision-table/` that are also
 * used by the editable decision table.
 */

import { ConditionCell } from './decision-table/ConditionCell'
import { OutputCell } from './decision-table/OutputCell'
import { TableHeader } from './decision-table/TableHeader'
import {
  getInputLabel,
  discoverConditionFields,
  discoverOutputFields,
} from './decision-table/shared'

// Re-export types so existing consumers don't break
export type {
  HitPolicy,
  OperatorCondition,
  Condition,
  RuleRow,
  InputDef,
  RulesData,
} from './decision-table/shared'

export interface DecisionTableProps {
  rules: import('./decision-table/shared').RulesData
}

export function DecisionTable({ rules }: DecisionTableProps) {
  const conditionFields =
    rules.inputs?.map(getInputLabel) ?? discoverConditionFields(rules.rules)
  const outputFields = discoverOutputFields(rules.rules)

  return (
    <div className="fp-decision-table" data-testid="decision-table">
      <div className="fp-decision-table__header">
        <span className="fp-decision-table__hit-policy" data-testid="hit-policy-badge">
          {rules.hit_policy}
        </span>
      </div>

      {rules.rules.length === 0 ? (
        <div className="fp-decision-table__empty">No rules defined</div>
      ) : (
        <table className="fp-decision-table__table">
          <TableHeader
            conditionFields={conditionFields}
            outputFields={outputFields}
          />
          <tbody>
            {rules.rules.map((rule, rowIdx) => (
              <tr key={rowIdx} data-testid={`rule-row-${String(rowIdx)}`}>
                <td>{rowIdx + 1}</td>
                {conditionFields.map((field) => (
                  <ConditionCell
                    key={`cond-${field}`}
                    condition={rule.when?.[field]}
                  />
                ))}
                {outputFields.map((field) => (
                  <OutputCell key={`out-${field}`} value={rule.then[field]} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
