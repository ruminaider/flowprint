/**
 * Expression builder for decision table condition cells.
 *
 * Provides a structured UI for building condition objects:
 * - Operator dropdown (eq, not_eq, gt, gte, lt, lte, in, not_in, between)
 * - Value input(s) appropriate to the selected operator
 * - Raw text fallback for advanced users
 *
 * Produces a Condition object (e.g. { gte: 100 }) on commit.
 */

import { useCallback, useState } from 'react'
import type { Condition, OperatorCondition } from './decision-table/shared'
import { normalizeCondition } from './decision-table/shared'

export interface ConditionBuilderProps {
  value: Condition | undefined
  onChange: (condition: Condition) => void
}

const OPERATORS = [
  { value: 'eq', label: '= equals' },
  { value: 'not_eq', label: '\u2260 not equals' },
  { value: 'gt', label: '> greater than' },
  { value: 'gte', label: '\u2265 greater or equal' },
  { value: 'lt', label: '< less than' },
  { value: 'lte', label: '\u2264 less or equal' },
  { value: 'in', label: '\u2208 in list' },
  { value: 'not_in', label: '\u2209 not in list' },
  { value: 'between', label: '\u2194 between' },
] as const

type OperatorKey = (typeof OPERATORS)[number]['value']

function parseValue(raw: string): unknown {
  if (raw === '') return ''
  const num = Number(raw)
  if (!Number.isNaN(num) && raw.trim() !== '') return num
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw
}

function extractOperatorAndValue(condition: Condition | undefined): {
  operator: OperatorKey
  value: string
  lowValue: string
  highValue: string
} {
  if (condition === undefined) {
    return { operator: 'eq', value: '', lowValue: '', highValue: '' }
  }

  const normalized = normalizeCondition(condition)
  for (const op of OPERATORS) {
    const val = normalized[op.value as keyof OperatorCondition]
    if (val !== undefined) {
      if (op.value === 'between' && Array.isArray(val)) {
        return {
          operator: 'between',
          value: '',
          lowValue: String(val[0] ?? ''),
          highValue: String(val[1] ?? ''),
        }
      }
      if ((op.value === 'in' || op.value === 'not_in') && Array.isArray(val)) {
        return {
          operator: op.value,
          value: val.join(', '),
          lowValue: '',
          highValue: '',
        }
      }
      return {
        operator: op.value,
        value: String(val),
        lowValue: '',
        highValue: '',
      }
    }
  }

  return { operator: 'eq', value: '', lowValue: '', highValue: '' }
}

export function ConditionBuilder({ value, onChange }: ConditionBuilderProps) {
  const initial = extractOperatorAndValue(value)
  const [operator, setOperator] = useState<OperatorKey>(initial.operator)
  const [inputValue, setInputValue] = useState(initial.value)
  const [lowValue, setLowValue] = useState(initial.lowValue)
  const [highValue, setHighValue] = useState(initial.highValue)
  const [rawValue, setRawValue] = useState('')

  const commit = useCallback(() => {
    let condition: OperatorCondition

    if (operator === 'between') {
      condition = { between: [Number(lowValue) || 0, Number(highValue) || 0] }
    } else if (operator === 'in' || operator === 'not_in') {
      const items = inputValue.split(',').map((s) => {
        const trimmed = s.trim()
        return parseValue(trimmed)
      })
      condition = { [operator]: items } as OperatorCondition
    } else {
      condition = { [operator]: parseValue(inputValue) } as OperatorCondition
    }

    onChange(condition)
  }, [operator, inputValue, lowValue, highValue, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      }
    },
    [commit],
  )

  const handleRawKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onChange(parseValue(rawValue) as Condition)
      }
    },
    [rawValue, onChange],
  )

  const isBetween = operator === 'between'

  return (
    <div className="fp-condition-builder" data-testid="condition-builder">
      <div className="fp-condition-builder__structured">
        <select
          className="fp-condition-builder__operator"
          value={operator}
          onChange={(e) => setOperator(e.target.value as OperatorKey)}
          data-testid="operator-select"
        >
          {OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {isBetween ? (
          <div className="fp-condition-builder__between">
            <input
              className="fp-condition-builder__input"
              value={lowValue}
              onChange={(e) => setLowValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="low"
              data-testid="value-input-low"
            />
            <span className="fp-condition-builder__separator">to</span>
            <input
              className="fp-condition-builder__input"
              value={highValue}
              onChange={(e) => setHighValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="high"
              data-testid="value-input-high"
            />
          </div>
        ) : (
          <input
            className="fp-condition-builder__input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              operator === 'in' || operator === 'not_in'
                ? 'comma-separated values'
                : 'value'
            }
            data-testid="value-input"
          />
        )}
      </div>

      <div className="fp-condition-builder__raw">
        <input
          className="fp-condition-builder__raw-input"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          onKeyDown={handleRawKeyDown}
          placeholder="raw value (advanced)"
          data-testid="raw-condition-input"
        />
      </div>
    </div>
  )
}
