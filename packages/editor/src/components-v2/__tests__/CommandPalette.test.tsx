import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CommandPalette } from '../CommandPalette'
import type { Command } from '../CommandPaletteItem'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

const mockCommands: Command[] = [
  {
    id: 'action-node',
    label: 'Add Action Node',
    shortcut: 'A',
    category: 'Nodes',
    action: vi.fn(),
  },
  {
    id: 'switch-node',
    label: 'Add Switch Node',
    shortcut: 'S',
    category: 'Nodes',
    action: vi.fn(),
  },
  {
    id: 'undo',
    label: 'Undo',
    shortcut: 'Cmd+Z',
    category: 'Edit',
    action: vi.fn(),
  },
  {
    id: 'redo',
    label: 'Redo',
    shortcut: 'Cmd+Shift+Z',
    category: 'Edit',
    action: vi.fn(),
  },
]

describe('CommandPalette', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CommandPalette commands={mockCommands} isOpen={false} onClose={vi.fn()} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when isOpen is true', () => {
    render(
      <CommandPalette commands={mockCommands} isOpen={true} onClose={vi.fn()} />,
    )
    expect(screen.getByLabelText('Command search')).toBeInTheDocument()
    expect(screen.getByText('Add Action Node')).toBeInTheDocument()
    expect(screen.getByText('Add Switch Node')).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
    expect(screen.getByText('Redo')).toBeInTheDocument()
  })

  it('search input filters commands', () => {
    render(
      <CommandPalette commands={mockCommands} isOpen={true} onClose={vi.fn()} />,
    )

    const input = screen.getByLabelText('Command search')
    fireEvent.change(input, { target: { value: 'act' } })

    expect(screen.getByText('Add Action Node')).toBeInTheDocument()
    expect(screen.queryByText('Add Switch Node')).not.toBeInTheDocument()
  })

  it('arrow keys change active item', () => {
    render(
      <CommandPalette commands={mockCommands} isOpen={true} onClose={vi.fn()} />,
    )

    const palette = screen.getByLabelText('Command search').closest('.fp-command-palette')!

    // First item should be active initially
    const items = palette.querySelectorAll('.fp-command-palette__item')
    expect(items[0]).toHaveClass('fp-command-palette__item--active')

    // Press ArrowDown to move to second item
    fireEvent.keyDown(palette, { key: 'ArrowDown' })
    const updatedItems = palette.querySelectorAll('.fp-command-palette__item')
    expect(updatedItems[1]).toHaveClass('fp-command-palette__item--active')
    expect(updatedItems[0]).not.toHaveClass('fp-command-palette__item--active')
  })

  it('enter calls the active command action', () => {
    const action = vi.fn()
    const commands: Command[] = [
      { id: 'cmd-1', label: 'First', category: 'Test', action },
      { id: 'cmd-2', label: 'Second', category: 'Test', action: vi.fn() },
    ]

    render(
      <CommandPalette commands={commands} isOpen={true} onClose={vi.fn()} />,
    )

    const palette = screen.getByLabelText('Command search').closest('.fp-command-palette')!
    fireEvent.keyDown(palette, { key: 'Enter' })

    expect(action).toHaveBeenCalledOnce()
  })

  it('escape calls onClose', () => {
    const onClose = vi.fn()

    render(
      <CommandPalette commands={mockCommands} isOpen={true} onClose={onClose} />,
    )

    const palette = screen.getByLabelText('Command search').closest('.fp-command-palette')!
    fireEvent.keyDown(palette, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()

    render(
      <CommandPalette commands={mockCommands} isOpen={true} onClose={onClose} />,
    )

    fireEvent.click(screen.getByTestId('command-palette-backdrop'))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
