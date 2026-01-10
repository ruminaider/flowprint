import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SwitchConditionPopover } from './SwitchConditionPopover'
import type { PendingSwitchConnection } from '../hooks/useConnectionHandler'

const connection: PendingSwitchConnection = {
  source: 'switch_1',
  target: 'action_2',
}

describe('SwitchConditionPopover', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders condition input and buttons', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Condition')).toBeTruthy()
    expect(screen.getByPlaceholderText("e.g., status === 'approved'")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    expect(screen.getByLabelText('Make Default')).toBeTruthy()
  })

  it('confirm button is disabled when condition is empty and default not checked', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmBtn).toBeInstanceOf(HTMLButtonElement)
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('confirm button is enabled when condition has text', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText("e.g., status === 'approved'")
    fireEvent.change(input, { target: { value: 'x > 1' } })

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('typing condition and clicking Confirm calls onConfirm with value', () => {
    const onConfirm = vi.fn()

    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText("e.g., status === 'approved'")
    fireEvent.change(input, { target: { value: "status === 'approved'" } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith("status === 'approved'", undefined)
  })

  it('clicking Cancel calls onCancel', () => {
    const onCancel = vi.fn()

    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('checking "Make Default" enables confirm even with empty condition', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' })
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true)

    const checkbox = screen.getByLabelText('Make Default')
    fireEvent.click(checkbox)

    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it('"Make Default" checked calls onConfirm with isDefault=true', () => {
    const onConfirm = vi.fn()

    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    const checkbox = screen.getByLabelText('Make Default')
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onConfirm).toHaveBeenCalledWith('', true)
  })

  it('"Make Default" disables the condition input', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText(
      "e.g., status === 'approved'",
    ) as HTMLInputElement

    expect(input.disabled).toBe(false)

    const checkbox = screen.getByLabelText('Make Default')
    fireEvent.click(checkbox)

    expect(input.disabled).toBe(true)
  })

  it('auto-focuses condition input on mount', () => {
    render(
      <SwitchConditionPopover
        connection={connection}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText("e.g., status === 'approved'")
    expect(document.activeElement).toBe(input)
  })
})
