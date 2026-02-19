import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LaneHeader } from '../LaneHeader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLaneHeader(overrides?: Partial<React.ComponentProps<typeof LaneHeader>>) {
  const defaults = {
    laneId: 'lane-1',
    name: 'Customer Actions',
    color: '#3b82f6',
    collapsed: false,
    onToggleCollapse: vi.fn(),
    onRename: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<LaneHeader {...props} />), props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LaneHeader', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the lane name', () => {
    renderLaneHeader()

    expect(screen.getByText('Customer Actions')).toBeTruthy()
  })

  it('double-click on name switches to input for editing', () => {
    renderLaneHeader()

    const nameEl = screen.getByText('Customer Actions')
    fireEvent.doubleClick(nameEl)

    const input = screen.getByLabelText('Lane name')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('Customer Actions')
  })

  it('Enter key in input commits rename', () => {
    const { props } = renderLaneHeader()

    const nameEl = screen.getByText('Customer Actions')
    fireEvent.doubleClick(nameEl)

    const input = screen.getByLabelText('Lane name')
    fireEvent.change(input, { target: { value: 'Staff Actions' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRename).toHaveBeenCalledWith('lane-1', 'Staff Actions')
    // Should exit editing mode
    expect(screen.queryByLabelText('Lane name')).toBeNull()
  })

  it('Escape key in input cancels editing', () => {
    const { props } = renderLaneHeader()

    const nameEl = screen.getByText('Customer Actions')
    fireEvent.doubleClick(nameEl)

    const input = screen.getByLabelText('Lane name')
    fireEvent.change(input, { target: { value: 'Something Else' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    // Should exit editing mode without calling onRename
    expect(props.onRename).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Lane name')).toBeNull()
    // Original name should be displayed
    expect(screen.getByText('Customer Actions')).toBeTruthy()
  })

  it('collapse button fires onToggleCollapse', () => {
    const { props } = renderLaneHeader()

    const collapseBtn = screen.getByLabelText('Collapse lane')
    fireEvent.click(collapseBtn)

    expect(props.onToggleCollapse).toHaveBeenCalledWith('lane-1')
  })

  it('collapsed state shows Expand lane button', () => {
    renderLaneHeader({ collapsed: true })

    expect(screen.getByLabelText('Expand lane')).toBeTruthy()
    expect(screen.queryByLabelText('Collapse lane')).toBeNull()
  })

  it('expanded state shows Collapse lane button', () => {
    renderLaneHeader({ collapsed: false })

    expect(screen.getByLabelText('Collapse lane')).toBeTruthy()
    expect(screen.queryByLabelText('Expand lane')).toBeNull()
  })

  it('blur on input commits rename', () => {
    const { props } = renderLaneHeader()

    const nameEl = screen.getByText('Customer Actions')
    fireEvent.doubleClick(nameEl)

    const input = screen.getByLabelText('Lane name')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.blur(input)

    expect(props.onRename).toHaveBeenCalledWith('lane-1', 'New Name')
  })

  it('does not call onRename if name is unchanged', () => {
    const { props } = renderLaneHeader()

    const nameEl = screen.getByText('Customer Actions')
    fireEvent.doubleClick(nameEl)

    const input = screen.getByLabelText('Lane name')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRename).not.toHaveBeenCalled()
  })
})
