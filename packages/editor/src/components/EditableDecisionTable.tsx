/**
 * Editable decision table component.
 *
 * Composes the same shared sub-components as the read-only DecisionTable
 * but adds inline cell editing with local draft state, keyboard navigation,
 * and an onChange callback for committing changes.
 *
 * Architecture:
 * - Click on a cell enters edit mode with a local input element
 * - Keystrokes update only the local draft (no global state churn)
 * - Enter/blur commits the value and fires onChange with the full RulesData
 * - Escape discards the draft
 * - Tab/Shift+Tab/Arrow keys navigate between cells
 */

import { useCallback, useRef, useState } from 'react'
import {
  getInputLabel,
  discoverConditionFields,
  discoverOutputFields,
  formatCondition,
} from './decision-table/shared'
import type { RulesData, HitPolicy, Condition } from './decision-table/shared'

const HIT_POLICIES: HitPolicy[] = ['first', 'collect', 'all', 'priority']

export interface EditableDecisionTableProps {
  rules: RulesData
  onChange: (rules: RulesData) => void
}

/**
 * Identifies which cell is currently being edited.
 * `col` is the 0-based index into the flat cell list (conditions + outputs).
 */
interface EditingCell {
  row: number
  col: number
  /** Whether this is a condition cell (vs output cell). */
  isCondition: boolean
  /** The field name (condition or output key). */
  field: string
}

/**
 * Parse a string value into a typed value for output cells.
 * Attempts numeric parsing, boolean detection, then falls back to string.
 */
function parseOutputValue(raw: string): unknown {
  if (raw === '') return ''
  const num = Number(raw)
  if (!Number.isNaN(num) && raw.trim() !== '') return num
  if (raw === 'true') return true
  if (raw === 'false') return false
  return raw
}

/**
 * Get the display string for a cell's current value.
 */
function getOutputDisplayValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getConditionDisplayValue(condition: Condition | undefined): string {
  if (condition === undefined) return ''
  return formatCondition(condition)
}

export function EditableDecisionTable({ rules, onChange }: EditableDecisionTableProps) {
  const conditionFields =
    rules.inputs?.map(getInputLabel) ?? discoverConditionFields(rules.rules)
  const outputFields = discoverOutputFields(rules.rules)

  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRowRef = useRef<number | null>(null)

  const totalCols = conditionFields.length + outputFields.length

  // Compute the EditingCell for a given (row, col) index
  const cellAt = useCallback(
    (row: number, col: number): EditingCell | null => {
      if (row < 0 || row >= rules.rules.length) return null
      if (col < 0 || col >= totalCols) return null
      const isCondition = col < conditionFields.length
      const field = isCondition
        ? conditionFields[col]!
        : outputFields[col - conditionFields.length]!
      return { row, col, isCondition, field }
    },
    [conditionFields, outputFields, rules.rules.length, totalCols],
  )

  // Start editing a cell
  const startEditing = useCallback(
    (row: number, col: number) => {
      const cell = cellAt(row, col)
      if (!cell) return
      const rule = rules.rules[row]!
      const currentValue = cell.isCondition
        ? getConditionDisplayValue(rule.when?.[cell.field])
        : getOutputDisplayValue(rule.then[cell.field])
      setEditing(cell)
      setDraftValue(currentValue)
      // Focus input on next tick
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    },
    [cellAt, rules.rules],
  )

  // Commit the draft value
  const commitEdit = useCallback(() => {
    if (!editing) return

    const rule = rules.rules[editing.row]!
    const originalValue = editing.isCondition
      ? getConditionDisplayValue(rule.when?.[editing.field])
      : getOutputDisplayValue(rule.then[editing.field])

    // Only fire onChange if value actually changed
    if (draftValue === originalValue) {
      setEditing(null)
      return
    }

    const updatedRules = structuredClone(rules)
    const updatedRule = updatedRules.rules[editing.row]!

    if (editing.isCondition) {
      // For now, store condition edits as raw values
      if (!updatedRule.when) updatedRule.when = {}
      if (draftValue === '') {
        delete updatedRule.when[editing.field]
      } else {
        const parsed = parseOutputValue(draftValue)
        updatedRule.when[editing.field] = parsed as Condition
      }
    } else {
      updatedRule.then[editing.field] = parseOutputValue(draftValue)
    }

    setEditing(null)
    onChange(updatedRules)
  }, [editing, draftValue, rules, onChange])

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditing(null)
  }, [])

  // Navigate to adjacent cell: commit current + start editing next atomically
  const navigate = useCallback(
    (dRow: number, dCol: number) => {
      if (!editing) return

      const nextRow = editing.row + dRow
      const nextCol = editing.col + dCol
      const nextCell = cellAt(nextRow, nextCol)
      if (!nextCell) {
        // At boundary — just commit
        commitEdit()
        return
      }

      // Check if current value changed
      const rule = rules.rules[editing.row]!
      const originalValue = editing.isCondition
        ? getConditionDisplayValue(rule.when?.[editing.field])
        : getOutputDisplayValue(rule.then[editing.field])

      if (draftValue !== originalValue) {
        // Value changed — commit then move
        const updatedRules = structuredClone(rules)
        const updatedRule = updatedRules.rules[editing.row]!
        if (editing.isCondition) {
          if (!updatedRule.when) updatedRule.when = {}
          if (draftValue === '') {
            delete updatedRule.when[editing.field]
          } else {
            updatedRule.when[editing.field] = parseOutputValue(draftValue) as Condition
          }
        } else {
          updatedRule.then[editing.field] = parseOutputValue(draftValue)
        }
        onChange(updatedRules)
      }

      // Move to next cell
      const nextRule = rules.rules[nextRow]!
      const nextValue = nextCell.isCondition
        ? getConditionDisplayValue(nextRule.when?.[nextCell.field])
        : getOutputDisplayValue(nextRule.then[nextCell.field])
      setEditing(nextCell)
      setDraftValue(nextValue)
    },
    [editing, cellAt, draftValue, rules, onChange, commitEdit],
  )

  // Handle keyboard events in the input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          commitEdit()
          break
        case 'Escape':
          e.preventDefault()
          cancelEdit()
          break
        case 'Tab':
          e.preventDefault()
          navigate(0, e.shiftKey ? -1 : 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          navigate(1, 0)
          break
        case 'ArrowUp':
          e.preventDefault()
          navigate(-1, 0)
          break
      }
    },
    [commitEdit, cancelEdit, navigate],
  )

  // Handle cell click
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      startEditing(row, col)
    },
    [startEditing],
  )

  // Column management
  const addConditionColumn = useCallback(() => {
    const updatedRules = structuredClone(rules)
    const existingInputs = updatedRules.inputs?.map(getInputLabel) ?? discoverConditionFields(updatedRules.rules)
    // Generate unique name
    let name = 'new_condition'
    let suffix = 1
    while (existingInputs.includes(name)) {
      name = `new_condition_${String(suffix++)}`
    }
    updatedRules.inputs = [...existingInputs, name]
    onChange(updatedRules)
  }, [rules, onChange])

  const addOutputColumn = useCallback(() => {
    const updatedRules = structuredClone(rules)
    const existingOutputs = discoverOutputFields(updatedRules.rules)
    let name = 'new_output'
    let suffix = 1
    while (existingOutputs.includes(name)) {
      name = `new_output_${String(suffix++)}`
    }
    // Add the field to all rules with empty string default
    for (const rule of updatedRules.rules) {
      rule.then[name] = ''
    }
    onChange(updatedRules)
  }, [rules, onChange])

  const removeConditionColumn = useCallback(
    (colIdx: number) => {
      const updatedRules = structuredClone(rules)
      const fieldName = conditionFields[colIdx]!
      // Remove from inputs
      const currentInputs = updatedRules.inputs?.map(getInputLabel) ?? discoverConditionFields(updatedRules.rules)
      updatedRules.inputs = currentInputs.filter((_, i) => i !== colIdx)
      // Remove from all rules
      for (const rule of updatedRules.rules) {
        if (rule.when) {
          delete rule.when[fieldName]
        }
      }
      onChange(updatedRules)
    },
    [rules, conditionFields, onChange],
  )

  const removeOutputColumn = useCallback(
    (colIdx: number) => {
      const updatedRules = structuredClone(rules)
      const fieldName = outputFields[colIdx]!
      for (const rule of updatedRules.rules) {
        delete rule.then[fieldName]
      }
      onChange(updatedRules)
    },
    [rules, outputFields, onChange],
  )

  // Row management
  const addRow = useCallback(() => {
    const updatedRules = structuredClone(rules)
    updatedRules.rules.push({ then: {} })
    onChange(updatedRules)
  }, [rules, onChange])

  const deleteRow = useCallback(
    (rowIdx: number) => {
      const updatedRules = structuredClone(rules)
      updatedRules.rules.splice(rowIdx, 1)
      onChange(updatedRules)
    },
    [rules, onChange],
  )

  const duplicateRow = useCallback(
    (rowIdx: number) => {
      const updatedRules = structuredClone(rules)
      const copy = structuredClone(updatedRules.rules[rowIdx]!)
      updatedRules.rules.splice(rowIdx + 1, 0, copy)
      onChange(updatedRules)
    },
    [rules, onChange],
  )

  // Hit policy
  const changeHitPolicy = useCallback(
    (policy: HitPolicy) => {
      const updatedRules = structuredClone(rules)
      updatedRules.hit_policy = policy
      onChange(updatedRules)
    },
    [rules, onChange],
  )

  // Validation: collect error locations
  // For now, flag empty output cells (empty string values)
  const validationErrors: Array<{ row: number; col: number; message: string }> = []
  for (let rowIdx = 0; rowIdx < rules.rules.length; rowIdx++) {
    const rule = rules.rules[rowIdx]!
    for (let outIdx = 0; outIdx < outputFields.length; outIdx++) {
      const value = rule.then[outputFields[outIdx]!]
      if (value === '' || value === undefined) {
        validationErrors.push({
          row: rowIdx,
          col: conditionFields.length + outIdx,
          message: `Empty value in "${outputFields[outIdx]!}"`,
        })
      }
    }
  }

  const hasError = (row: number, col: number) =>
    validationErrors.some((e) => e.row === row && e.col === col)

  // Row drag-and-drop reordering
  const handleRowDragStart = useCallback((rowIdx: number) => {
    dragRowRef.current = rowIdx
  }, [])

  const handleRowDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleRowDrop = useCallback(
    (targetIdx: number) => {
      const sourceIdx = dragRowRef.current
      if (sourceIdx === null || sourceIdx === targetIdx) return
      dragRowRef.current = null

      const updatedRules = structuredClone(rules)
      const [moved] = updatedRules.rules.splice(sourceIdx, 1)
      updatedRules.rules.splice(targetIdx, 0, moved!)
      onChange(updatedRules)
    },
    [rules, onChange],
  )

  // Render an editable input or the condition display content (no nested <td>)
  const renderConditionCell = (row: number, col: number, field: string) => {
    const rule = rules.rules[row]!
    const isEditing = editing?.row === row && editing?.col === col
    const condition = rule.when?.[field]

    if (isEditing) {
      return (
        <td key={`cond-${field}`}>
          <input
            ref={inputRef}
            className="fp-decision-table__cell-input"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            data-testid={`cell-input-${row}-${col}`}
          />
        </td>
      )
    }

    return (
      <td
        key={`cond-${field}`}
        onClick={() => handleCellClick(row, col)}
        className="fp-decision-table__cell--editable"
      >
        {condition === undefined ? (
          <span className="fp-decision-table__wildcard">{'\u2014'}</span>
        ) : (
          <span className="fp-decision-table__operator-badge">
            {formatCondition(condition)}
          </span>
        )}
      </td>
    )
  }

  const renderOutputCell = (row: number, col: number, field: string) => {
    const rule = rules.rules[row]!
    const isEditing = editing?.row === row && editing?.col === col
    const errorClass = hasError(row, col) ? ' fp-decision-table__cell--error' : ''

    if (isEditing) {
      return (
        <td key={`out-${field}`} className={errorClass.trim() || undefined}>
          <input
            ref={inputRef}
            className="fp-decision-table__cell-input"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            data-testid={`cell-input-${row}-${col}`}
          />
        </td>
      )
    }

    return (
      <td
        key={`out-${field}`}
        onClick={() => handleCellClick(row, col)}
        className={`fp-decision-table__cell--editable${errorClass}`}
      >
        {getOutputDisplayValue(rule.then[field])}
      </td>
    )
  }

  return (
    <div className="fp-decision-table fp-decision-table--editable" data-testid="editable-decision-table">
      <div className="fp-decision-table__header">
        <select
          className="fp-decision-table__hit-policy-select"
          value={rules.hit_policy}
          onChange={(e) => changeHitPolicy(e.target.value as HitPolicy)}
          data-testid="hit-policy-select"
        >
          {HIT_POLICIES.map((hp) => (
            <option key={hp} value={hp}>
              {hp}
            </option>
          ))}
        </select>
      </div>

      {rules.rules.length === 0 ? (
        <div className="fp-decision-table__empty">No rules defined</div>
      ) : (
        <table className="fp-decision-table__table">
          <thead>
            <tr>
              <th>#</th>
              {conditionFields.map((field, colIdx) => (
                <th
                  key={`cond-${field}`}
                  className="fp-decision-table__table th--condition"
                  draggable
                  data-testid={`draggable-col-condition-${String(colIdx)}`}
                >
                  {field}
                  <button
                    type="button"
                    className="fp-decision-table__col-remove-btn"
                    onClick={() => removeConditionColumn(colIdx)}
                    data-testid={`remove-col-condition-${String(colIdx)}`}
                    title={`Remove column ${field}`}
                  >
                    ✕
                  </button>
                </th>
              ))}
              <th>
                <button
                  type="button"
                  className="fp-decision-table__col-add-btn"
                  onClick={addConditionColumn}
                  data-testid="add-condition-col-btn"
                  title="Add condition column"
                >
                  +
                </button>
              </th>
              {outputFields.map((field, colIdx) => (
                <th
                  key={`out-${field}`}
                  className="fp-decision-table__table th--output"
                  draggable
                  data-testid={`draggable-col-output-${String(colIdx)}`}
                >
                  {field}
                  <button
                    type="button"
                    className="fp-decision-table__col-remove-btn"
                    onClick={() => removeOutputColumn(colIdx)}
                    data-testid={`remove-col-output-${String(colIdx)}`}
                    title={`Remove column ${field}`}
                  >
                    ✕
                  </button>
                </th>
              ))}
              <th>
                <button
                  type="button"
                  className="fp-decision-table__col-add-btn"
                  onClick={addOutputColumn}
                  data-testid="add-output-col-btn"
                  title="Add output column"
                >
                  +
                </button>
              </th>
              <th></th>{/* Row controls header */}
            </tr>
          </thead>
          <tbody>
            {rules.rules.map((_rule, rowIdx) => (
              <tr
                key={rowIdx}
                data-testid={`rule-row-${String(rowIdx)}`}
                onDragOver={handleRowDragOver}
                onDrop={() => handleRowDrop(rowIdx)}
              >
                <td>
                  <span
                    className="fp-decision-table__drag-handle"
                    draggable
                    onDragStart={() => handleRowDragStart(rowIdx)}
                    data-testid={`drag-handle-row-${String(rowIdx)}`}
                    title="Drag to reorder"
                  >
                    ⠿
                  </span>
                  {rowIdx + 1}
                </td>
                {conditionFields.map((field, colIdx) =>
                  renderConditionCell(rowIdx, colIdx, field),
                )}
                {outputFields.map((field, colIdx) =>
                  renderOutputCell(rowIdx, conditionFields.length + colIdx, field),
                )}
                <td className="fp-decision-table__row-controls">
                  <button
                    type="button"
                    className="fp-decision-table__row-btn"
                    onClick={() => duplicateRow(rowIdx)}
                    data-testid={`duplicate-row-${String(rowIdx)}`}
                    title="Duplicate row"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    className="fp-decision-table__row-btn fp-decision-table__row-btn--delete"
                    onClick={() => deleteRow(rowIdx)}
                    data-testid={`delete-row-${String(rowIdx)}`}
                    title="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {validationErrors.length > 0 && (
        <div
          className="fp-decision-table__validation-summary"
          data-testid="validation-summary"
        >
          {validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}
        </div>
      )}

      <button
        type="button"
        className="fp-decision-table__add-row-btn"
        onClick={addRow}
        data-testid="add-row-btn"
      >
        + Add rule
      </button>
    </div>
  )
}
