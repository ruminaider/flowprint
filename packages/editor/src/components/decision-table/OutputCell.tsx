/**
 * Renders a single output cell in a decision table.
 * Displays the value as a string, or empty for undefined/null.
 */

export interface OutputCellProps {
  value: unknown
}

export function OutputCell({ value }: OutputCellProps) {
  const display =
    value === undefined || value === null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value as string | number | boolean)

  return <td>{display}</td>
}
