import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NewBlueprintWizard } from './NewBlueprintWizard'
import { SUPPORTED_VERSIONS } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
})

afterEach(() => {
  cleanup()
})

describe('NewBlueprintWizard', () => {
  it('renders form fields with default values', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    expect(screen.getByLabelText('Blueprint name')).toBeTruthy()
    expect(screen.getByLabelText('Description')).toBeTruthy()
    expect(screen.getByLabelText('Schema version')).toBeTruthy()
    // Default lane is present
    expect(screen.getByLabelText('Lane 1 ID')).toBeTruthy()
    expect(screen.getByLabelText('Lane 1 label')).toBeTruthy()
  })

  it('shows error when name is empty on submit', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    // Clear the name field (it starts empty)
    fireEvent.click(screen.getByText('Create'))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Blueprint name is required')).toBeTruthy()
  })

  it('shows error when name contains spaces', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Blueprint name'), {
      target: { value: 'my service' },
    })
    fireEvent.click(screen.getByText('Create'))

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Name must not contain spaces (use kebab-case)')).toBeTruthy()
  })

  it('adds and removes lanes', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    // Start with 1 lane
    expect(screen.getByLabelText('Lane 1 ID')).toBeTruthy()
    expect(screen.queryByLabelText('Lane 2 ID')).toBeNull()

    // Add a lane
    fireEvent.click(screen.getByText('Add Lane'))
    expect(screen.getByLabelText('Lane 2 ID')).toBeTruthy()

    // Remove the second lane
    const removeButtons = screen.getAllByText('Remove')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.click(removeButtons[1]!)
    expect(screen.queryByLabelText('Lane 2 ID')).toBeNull()
  })

  it('cannot remove the last lane', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    // Only one lane, the Remove button should be disabled
    const removeButton = screen.getByText('Remove')
    expect((removeButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('creates valid document on submit', () => {
    const onCreate = vi.fn()
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.change(screen.getByLabelText('Blueprint name'), {
      target: { value: 'my-service' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'A test blueprint' },
    })

    // Set lane values (default lane has id='customer', label='Customer', visibility='external')
    fireEvent.click(screen.getByText('Create'))

    expect(onCreate).toHaveBeenCalledOnce()
    const call = onCreate.mock.calls[0]
    expect(call).toBeTruthy()
    const doc = (call as [FlowprintDocument])[0]
    expect(doc.schema).toBe('flowprint/1.0')
    expect(doc.name).toBe('my-service')
    expect(doc.version).toBe('0.1.0')
    expect(doc.description).toBe('A test blueprint')
    expect(doc.lanes).toEqual({
      customer: { label: 'Customer', visibility: 'external', order: 0 },
    })
    expect(doc.nodes).toEqual({})
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()
    render(<NewBlueprintWizard open={true} onClose={onClose} onCreate={vi.fn()} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('schema version dropdown contains SUPPORTED_VERSIONS', () => {
    render(<NewBlueprintWizard open={true} onClose={vi.fn()} onCreate={vi.fn()} />)

    const select = screen.getByLabelText<HTMLSelectElement>('Schema version')
    const options = Array.from(select.options).map((opt) => opt.value)
    expect(options).toEqual([...SUPPORTED_VERSIONS])
  })
})
