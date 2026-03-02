import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ConditionBuilder } from '../ConditionBuilder'
import type { Condition } from '../decision-table/shared'

afterEach(() => {
  cleanup()
})

describe('ConditionBuilder', () => {
  it('renders operator dropdown with all operators', () => {
    render(<ConditionBuilder value={undefined} onChange={vi.fn()} />)

    const select = screen.getByTestId('operator-select')
    expect(select).toBeInTheDocument()

    // Check key operators are available
    const options = select.querySelectorAll('option')
    const values = [...options].map((o) => o.value)
    expect(values).toContain('eq')
    expect(values).toContain('gte')
    expect(values).toContain('between')
    expect(values).toContain('in')
  })

  it('select gte + enter 100 produces { gte: 100 }', () => {
    const onChange = vi.fn()
    render(<ConditionBuilder value={undefined} onChange={onChange} />)

    const select = screen.getByTestId('operator-select')
    fireEvent.change(select, { target: { value: 'gte' } })

    const input = screen.getByTestId('value-input')
    fireEvent.change(input, { target: { value: '100' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({ gte: 100 })
  })

  it('select eq + enter string produces { eq: "hello" }', () => {
    const onChange = vi.fn()
    render(<ConditionBuilder value={undefined} onChange={onChange} />)

    const select = screen.getByTestId('operator-select')
    fireEvent.change(select, { target: { value: 'eq' } })

    const input = screen.getByTestId('value-input')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({ eq: 'hello' })
  })

  it('select between shows two inputs', () => {
    render(<ConditionBuilder value={undefined} onChange={vi.fn()} />)

    const select = screen.getByTestId('operator-select')
    fireEvent.change(select, { target: { value: 'between' } })

    expect(screen.getByTestId('value-input-low')).toBeInTheDocument()
    expect(screen.getByTestId('value-input-high')).toBeInTheDocument()
  })

  it('between with two values produces { between: [low, high] }', () => {
    const onChange = vi.fn()
    render(<ConditionBuilder value={undefined} onChange={onChange} />)

    const select = screen.getByTestId('operator-select')
    fireEvent.change(select, { target: { value: 'between' } })

    const low = screen.getByTestId('value-input-low')
    const high = screen.getByTestId('value-input-high')
    fireEvent.change(low, { target: { value: '10' } })
    fireEvent.change(high, { target: { value: '50' } })
    fireEvent.keyDown(high, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({ between: [10, 50] })
  })

  it('in operator with comma-separated values produces { in: [...] }', () => {
    const onChange = vi.fn()
    render(<ConditionBuilder value={undefined} onChange={onChange} />)

    const select = screen.getByTestId('operator-select')
    fireEvent.change(select, { target: { value: 'in' } })

    const input = screen.getByTestId('value-input')
    fireEvent.change(input, { target: { value: 'gold, silver, platinum' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith({ in: ['gold', 'silver', 'platinum'] })
  })

  it('initializes from existing condition', () => {
    const existing: Condition = { gte: 100 }
    render(<ConditionBuilder value={existing} onChange={vi.fn()} />)

    const select = screen.getByTestId('operator-select') as HTMLSelectElement
    expect(select.value).toBe('gte')

    const input = screen.getByTestId('value-input') as HTMLInputElement
    expect(input.value).toBe('100')
  })

  it('initializes from shorthand condition (string)', () => {
    render(<ConditionBuilder value="gold" onChange={vi.fn()} />)

    const select = screen.getByTestId('operator-select') as HTMLSelectElement
    expect(select.value).toBe('eq')

    const input = screen.getByTestId('value-input') as HTMLInputElement
    expect(input.value).toBe('gold')
  })

  it('raw text fallback input is available', () => {
    render(<ConditionBuilder value={undefined} onChange={vi.fn()} />)

    const rawInput = screen.getByTestId('raw-condition-input')
    expect(rawInput).toBeInTheDocument()
  })

  it('raw text input commits a parsed value on Enter', () => {
    const onChange = vi.fn()
    render(<ConditionBuilder value={undefined} onChange={onChange} />)

    const rawInput = screen.getByTestId('raw-condition-input')
    fireEvent.change(rawInput, { target: { value: '42' } })
    fireEvent.keyDown(rawInput, { key: 'Enter' })

    // Numeric shorthand — stored as { eq: 42 }
    expect(onChange).toHaveBeenCalledWith(42)
  })
})
