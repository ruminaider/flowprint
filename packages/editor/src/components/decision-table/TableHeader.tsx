/**
 * Renders the decision table column headers row.
 * The hit policy badge is rendered separately (it sits outside the <table>).
 */

export interface TableHeaderProps {
  conditionFields: string[]
  outputFields: string[]
}

export function TableHeader({ conditionFields, outputFields }: TableHeaderProps) {
  return (
    <thead>
      <tr>
        <th>#</th>
        {conditionFields.map((field) => (
          <th key={`cond-${field}`} className="fp-decision-table__table th--condition">
            {field}
          </th>
        ))}
        {outputFields.map((field) => (
          <th key={`out-${field}`} className="fp-decision-table__table th--output">
            {field}
          </th>
        ))}
      </tr>
    </thead>
  )
}
