import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { EditableDecisionTable } from '../EditableDecisionTable'
import type { RulesData } from '../decision-table/shared'

afterEach(() => {
  cleanup()
})

const sampleRules: RulesData = {
  hit_policy: 'first',
  inputs: ['order.total_amount', 'customer.tier'],
  rules: [
    {
      when: {
        'order.total_amount': { gte: 100 },
        'customer.tier': { in: ['gold', 'platinum'] },
      },
      then: { discount: 0.2, label: 'VIP discount' },
    },
    {
      when: {
        'order.total_amount': { gte: 50 },
      },
      then: { discount: 0.1, label: 'Standard discount' },
    },
    {
      then: { discount: 0, label: 'No discount' },
    },
  ],
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('EditableDecisionTable', () => {
  describe('rendering', () => {
    it('renders all existing rule data correctly', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      // Should have 3 rule rows
      expect(screen.getByTestId('rule-row-0')).toBeInTheDocument()
      expect(screen.getByTestId('rule-row-1')).toBeInTheDocument()
      expect(screen.getByTestId('rule-row-2')).toBeInTheDocument()

      // Should show hit policy selector
      const hitPolicySelect = screen.getByTestId('hit-policy-select') as HTMLSelectElement
      expect(hitPolicySelect.value).toBe('first')

      // Should have condition column headers
      expect(screen.getByText('order.total_amount')).toBeInTheDocument()
      expect(screen.getByText('customer.tier')).toBeInTheDocument()

      // Should have output column headers
      expect(screen.getByText('discount')).toBeInTheDocument()
      expect(screen.getByText('label')).toBeInTheDocument()
    })

    it('renders wildcard cells for missing conditions', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      // Row 3 has no conditions — should have wildcard indicators
      const row3 = screen.getByTestId('rule-row-2')
      const wildcards = row3.querySelectorAll('.fp-decision-table__wildcard')
      expect(wildcards.length).toBe(2) // both condition columns
    })

    it('renders operator badges for conditions', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      // Row 1 should have operator badges
      const row1 = screen.getByTestId('rule-row-0')
      const badges = row1.querySelectorAll('.fp-decision-table__operator-badge')
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Cell editing
  // ---------------------------------------------------------------------------

  describe('cell editing', () => {
    it('click on output cell opens input editor', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      // Cells: [#, cond1, cond2, out1, out2] — click on out1 (index 3)
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')
      expect(input).toBeInTheDocument()
    })

    it('typing in cell updates only local state (no onChange during typing)', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.change(input, { target: { value: '0.5' } })

      // onChange should NOT fire during typing
      expect(onChange).not.toHaveBeenCalled()
    })

    it('pressing Enter commits value and fires onChange', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.change(input, { target: { value: '0.5' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onChange).toHaveBeenCalledTimes(1)
      const updatedRules = onChange.mock.calls[0]![0] as RulesData
      expect(updatedRules.rules[0]!.then.discount).toBe(0.5)
    })

    it('blur commits value and fires onChange', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.change(input, { target: { value: '0.3' } })
      fireEvent.blur(input)

      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('Escape cancels edit and restores original value', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.change(input, { target: { value: '999' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      // onChange should NOT fire on cancel
      expect(onChange).not.toHaveBeenCalled()

      // Input should be removed (editing cancelled)
      expect(outputCell.querySelector('input')).not.toBeInTheDocument()
    })

    it('does not fire onChange when value is unchanged', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      // Don't change the value, just press Enter
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onChange).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('Tab moves to next cell', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[3]!
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.keyDown(input, { key: 'Tab' })

      // Next cell (out2) should now be editing
      const nextCell = outputCells[4]!
      expect(nextCell.querySelector('input')).toBeInTheDocument()
    })

    it('Shift+Tab moves to previous cell', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const row1 = screen.getByTestId('rule-row-0')
      const outputCells = row1.querySelectorAll('td')
      const outputCell = outputCells[4]! // out2
      fireEvent.click(outputCell)

      const input = outputCell.querySelector('input')!
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })

      // Previous cell (out1) should now be editing
      const prevCell = outputCells[3]!
      expect(prevCell.querySelector('input')).toBeInTheDocument()
    })

    it('ArrowDown moves to same column in next row', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const row1 = screen.getByTestId('rule-row-0')
      const row1Cells = row1.querySelectorAll('td')
      const cell = row1Cells[3]! // out1, row 0
      fireEvent.click(cell)

      const input = cell.querySelector('input')!
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Same column in row 1 should now be editing
      const row2 = screen.getByTestId('rule-row-1')
      const row2Cells = row2.querySelectorAll('td')
      expect(row2Cells[3]!.querySelector('input')).toBeInTheDocument()
    })

    it('ArrowUp moves to same column in previous row', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const row2 = screen.getByTestId('rule-row-1')
      const row2Cells = row2.querySelectorAll('td')
      const cell = row2Cells[3]! // out1, row 1
      fireEvent.click(cell)

      const input = cell.querySelector('input')!
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      // Same column in row 0 should now be editing
      const row1 = screen.getByTestId('rule-row-0')
      const row1Cells = row1.querySelectorAll('td')
      expect(row1Cells[3]!.querySelector('input')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // onChange emits correct shape
  // ---------------------------------------------------------------------------

  describe('onChange shape', () => {
    it('emits complete updated RulesData with all rules preserved', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      // Edit output cell in row 2 (discount column)
      const row2 = screen.getByTestId('rule-row-1')
      const cells = row2.querySelectorAll('td')
      const discountCell = cells[3]! // out1
      fireEvent.click(discountCell)

      const input = discountCell.querySelector('input')!
      fireEvent.change(input, { target: { value: '0.15' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      const updatedRules = onChange.mock.calls[0]![0] as RulesData
      // Hit policy preserved
      expect(updatedRules.hit_policy).toBe('first')
      // Inputs preserved
      expect(updatedRules.inputs).toEqual(['order.total_amount', 'customer.tier'])
      // All 3 rules still present
      expect(updatedRules.rules).toHaveLength(3)
      // Row 2 updated
      expect(updatedRules.rules[1]!.then.discount).toBe(0.15)
      // Other rows unchanged
      expect(updatedRules.rules[0]!.then.discount).toBe(0.2)
      expect(updatedRules.rules[2]!.then.discount).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Row management
  // ---------------------------------------------------------------------------

  describe('row management', () => {
    it('add row button produces a new empty rule', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const addBtn = screen.getByTestId('add-row-btn')
      fireEvent.click(addBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      expect(updated.rules).toHaveLength(4) // was 3
      const newRule = updated.rules[3]!
      expect(newRule.then).toEqual({})
      expect(newRule.when).toBeUndefined()
    })

    it('delete row removes the specified rule', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      // Delete row 1 (index 0)
      const deleteBtn = screen.getByTestId('delete-row-0')
      fireEvent.click(deleteBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      expect(updated.rules).toHaveLength(2) // was 3
      // First rule should now be what was the second rule
      expect(updated.rules[0]!.then.discount).toBe(0.1)
    })

    it('duplicate row copies all fields', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const dupBtn = screen.getByTestId('duplicate-row-0')
      fireEvent.click(dupBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      expect(updated.rules).toHaveLength(4)
      // Duplicated rule should be at index 1 (after original)
      expect(updated.rules[1]!.then.discount).toBe(0.2)
      expect(updated.rules[1]!.then.label).toBe('VIP discount')
      // Should be a deep copy, not same reference
      expect(updated.rules[1]).not.toBe(updated.rules[0])
      expect(updated.rules[1]).toEqual(updated.rules[0])
    })
  })

  // ---------------------------------------------------------------------------
  // Column management
  // ---------------------------------------------------------------------------

  describe('column management', () => {
    it('add condition column button adds new input field', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const addBtn = screen.getByTestId('add-condition-col-btn')
      fireEvent.click(addBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      // Should have 3 inputs (was 2 + new one)
      expect(updated.inputs).toHaveLength(3)
      expect(updated.inputs![2]).toBe('new_condition')
    })

    it('add output column button adds new output field to all rules', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const addBtn = screen.getByTestId('add-output-col-btn')
      fireEvent.click(addBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      // Every rule should now have the new output field
      for (const rule of updated.rules) {
        expect('new_output' in rule.then).toBe(true)
      }
    })

    it('remove condition column removes the field from inputs and all rules', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const removeBtn = screen.getByTestId('remove-col-condition-0')
      fireEvent.click(removeBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      expect(updated.inputs).toHaveLength(1)
      expect(updated.inputs![0]).toBe('customer.tier')
      // Removed field should be gone from all rules' when
      for (const rule of updated.rules) {
        if (rule.when) {
          expect('order.total_amount' in rule.when).toBe(false)
        }
      }
    })

    it('remove output column removes the field from all rules', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const removeBtn = screen.getByTestId('remove-col-output-0')
      fireEvent.click(removeBtn)

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      // 'discount' should be gone from all rules
      for (const rule of updated.rules) {
        expect('discount' in rule.then).toBe(false)
      }
      // 'label' should remain
      expect(updated.rules[0]!.then.label).toBe('VIP discount')
    })
  })

  // ---------------------------------------------------------------------------
  // Drag-and-drop reordering (unit-testable parts)
  // ---------------------------------------------------------------------------

  describe('drag-and-drop', () => {
    it('rows have draggable handles', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const handle0 = screen.getByTestId('drag-handle-row-0')
      const handle1 = screen.getByTestId('drag-handle-row-1')
      expect(handle0).toBeInTheDocument()
      expect(handle1).toBeInTheDocument()
    })

    it('condition column headers have draggable attribute', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const headers = screen.getAllByTestId(/^draggable-col-/)
      expect(headers.length).toBeGreaterThanOrEqual(2) // at least 2 condition columns
    })
  })

  // ---------------------------------------------------------------------------
  // Hit policy selector
  // ---------------------------------------------------------------------------

  describe('hit policy selector', () => {
    it('renders hit policy as a dropdown with all options', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      const select = screen.getByTestId('hit-policy-select') as HTMLSelectElement
      expect(select).toBeInTheDocument()
      expect(select.value).toBe('first')

      const options = select.querySelectorAll('option')
      const values = [...options].map((o) => o.value)
      expect(values).toEqual(['first', 'collect', 'all', 'priority'])
    })

    it('changing hit policy fires onChange with updated policy', () => {
      const onChange = vi.fn()
      render(<EditableDecisionTable rules={sampleRules} onChange={onChange} />)

      const select = screen.getByTestId('hit-policy-select')
      fireEvent.change(select, { target: { value: 'collect' } })

      expect(onChange).toHaveBeenCalledTimes(1)
      const updated = onChange.mock.calls[0]![0] as RulesData
      expect(updated.hit_policy).toBe('collect')
      // Rules should be unchanged
      expect(updated.rules).toHaveLength(3)
    })
  })

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  describe('validation', () => {
    const rulesWithErrors: RulesData = {
      hit_policy: 'first',
      inputs: ['order.total_amount', 'customer.tier'],
      rules: [
        {
          when: {
            'order.total_amount': { gte: 100 },
            'customer.tier': 'gold',
          },
          then: { discount: 0.2, label: 'VIP discount' },
        },
        {
          when: {
            'order.total_amount': { gte: 50 },
          },
          then: { discount: '', label: 'Standard discount' }, // empty output = error
        },
        {
          then: { discount: 0, label: '' }, // empty output = error
        },
      ],
    }

    it('marks cells with empty output values as errors', () => {
      render(<EditableDecisionTable rules={rulesWithErrors} onChange={vi.fn()} />)

      // Row 1 (index 1): discount='' should be flagged
      const row1 = screen.getByTestId('rule-row-1')
      const row1Cells = row1.querySelectorAll('td')
      // Cells: [#, cond1, cond2, out1, out2] — out1 is index 3
      const emptyDiscountCell = row1Cells[3]!
      expect(emptyDiscountCell.className).toContain('fp-decision-table__cell--error')

      // Row 2 (index 2): label='' should also be flagged
      const row2 = screen.getByTestId('rule-row-2')
      const row2Cells = row2.querySelectorAll('td')
      const emptyLabelCell = row2Cells[4]!
      expect(emptyLabelCell.className).toContain('fp-decision-table__cell--error')
    })

    it('shows validation summary with error count', () => {
      render(<EditableDecisionTable rules={rulesWithErrors} onChange={vi.fn()} />)

      const summary = screen.getByTestId('validation-summary')
      expect(summary).toBeInTheDocument()
      // Two empty output cells = 2 errors
      expect(summary.textContent).toMatch(/2/)
    })

    it('does not show validation summary when no errors', () => {
      render(<EditableDecisionTable rules={sampleRules} onChange={vi.fn()} />)

      expect(screen.queryByTestId('validation-summary')).not.toBeInTheDocument()
    })
  })
})
