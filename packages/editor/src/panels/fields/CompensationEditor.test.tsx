import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CompensationEditor } from './CompensationEditor'

describe('CompensationEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders disabled state', () => {
    render(<CompensationEditor compensation={undefined} onChange={vi.fn()} />)

    expect(screen.getByText('Compensation')).toBeTruthy()
    expect(screen.getByLabelText('Add compensation')).toBeTruthy()
  })

  it('toggles compensation on', () => {
    const onChange = vi.fn()
    render(<CompensationEditor compensation={undefined} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Add compensation'))
    expect(onChange).toHaveBeenCalledWith({ file: '', symbol: '' })
  })

  it('toggles compensation off', () => {
    const onChange = vi.fn()
    render(
      <CompensationEditor
        compensation={{ file: 'src/comp.ts', symbol: 'rollback' }}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByLabelText('Remove compensation'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('edits the file field', () => {
    const onChange = vi.fn()
    render(<CompensationEditor compensation={{ file: '', symbol: '' }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Compensation file'), {
      target: { value: 'src/rollback.ts' },
    })
    expect(onChange).toHaveBeenCalledWith({ file: 'src/rollback.ts', symbol: '' })
  })

  it('edits the symbol field', () => {
    const onChange = vi.fn()
    render(
      <CompensationEditor
        compensation={{ file: 'src/rollback.ts', symbol: '' }}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByLabelText('Compensation symbol'), {
      target: { value: 'undoPayment' },
    })
    expect(onChange).toHaveBeenCalledWith({
      file: 'src/rollback.ts',
      symbol: 'undoPayment',
    })
  })
})
