import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { InputsEditor } from './InputsEditor'

describe('InputsEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders with no inputs (disabled state)', () => {
    render(<InputsEditor inputs={undefined} onChange={vi.fn()} />)

    expect(screen.getByText('Inputs')).toBeTruthy()
    expect(screen.getByLabelText('Add inputs')).toBeTruthy()
  })

  it('renders with inputs', () => {
    render(<InputsEditor inputs={{ orderId: 'ctx.orderId', amount: '100' }} onChange={vi.fn()} />)

    expect(screen.getByDisplayValue('orderId')).toBeTruthy()
    expect(screen.getByDisplayValue('ctx.orderId')).toBeTruthy()
    expect(screen.getByDisplayValue('amount')).toBeTruthy()
    expect(screen.getByDisplayValue('100')).toBeTruthy()
  })

  it('toggles inputs on', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={undefined} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Add inputs'))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('toggles inputs off', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={{ key: 'val' }} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Remove inputs'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('adds a new row', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={{ existing: 'val' }} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Add input row'))
    expect(onChange).toHaveBeenCalledWith({ existing: 'val', '': '' })
  })

  it('removes a row', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={{ a: '1', b: '2' }} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Remove input 1'))
    expect(onChange).toHaveBeenCalledWith({ b: '2' })
  })

  it('edits a key', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={{ oldKey: 'val' }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Input 1 name'), {
      target: { value: 'newKey' },
    })
    expect(onChange).toHaveBeenCalledWith({ newKey: 'val' })
  })

  it('edits a value', () => {
    const onChange = vi.fn()
    render(<InputsEditor inputs={{ key: 'oldVal' }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Input 1 value'), {
      target: { value: 'newVal' },
    })
    expect(onChange).toHaveBeenCalledWith({ key: 'newVal' })
  })
})
