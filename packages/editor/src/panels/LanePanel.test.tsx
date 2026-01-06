import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { LanePanel } from './LanePanel'

const baseDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test',
  version: '1.0.0',
  lanes: {
    customer: { label: 'Customer', visibility: 'external', order: 0 },
    support: { label: 'Support', visibility: 'internal', order: 1 },
    backend: { label: 'Backend', visibility: 'internal', order: 2 },
  },
  nodes: {
    start: {
      type: 'action',
      lane: 'customer',
      label: 'Start',
      next: 'end',
    },
  },
}

function renderPanel(overrides?: Partial<FlowprintDocument>) {
  const doc: FlowprintDocument = { ...baseDoc, ...overrides }
  const onAddLane = vi.fn()
  const onUpdateLane = vi.fn()
  const onRemoveLane = vi.fn()
  const onReorderLanes = vi.fn()

  const result = render(
    <LanePanel
      doc={doc}
      onAddLane={onAddLane}
      onUpdateLane={onUpdateLane}
      onRemoveLane={onRemoveLane}
      onReorderLanes={onReorderLanes}
    />,
  )

  return { ...result, onAddLane, onUpdateLane, onRemoveLane, onReorderLanes, doc }
}

describe('LanePanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders lanes sorted by order', () => {
    const { container } = renderPanel()
    const items = container.querySelectorAll('.fp-lane-item')
    expect(items).toHaveLength(3)

    const inputs = container.querySelectorAll<HTMLInputElement>('.fp-lane-item input')
    expect(inputs.item(0).value).toBe('Customer')
    expect(inputs.item(1).value).toBe('Support')
    expect(inputs.item(2).value).toBe('Backend')
  })

  it('renders lanes in correct order when order values are non-sequential', () => {
    const { container } = renderPanel({
      lanes: {
        z_lane: { label: 'Z Lane', visibility: 'internal', order: 10 },
        a_lane: { label: 'A Lane', visibility: 'external', order: 0 },
        m_lane: { label: 'M Lane', visibility: 'internal', order: 5 },
      },
    })

    const inputs = container.querySelectorAll<HTMLInputElement>('.fp-lane-item input')
    expect(inputs.item(0).value).toBe('A Lane')
    expect(inputs.item(1).value).toBe('M Lane')
    expect(inputs.item(2).value).toBe('Z Lane')
  })

  it('add lane button creates new lane with correct defaults', () => {
    const { onAddLane } = renderPanel()

    fireEvent.click(screen.getByText('Add Lane'))

    expect(onAddLane).toHaveBeenCalledOnce()
    expect(onAddLane).toHaveBeenCalledWith('new_lane_1', {
      label: 'New Lane',
      visibility: 'internal',
      order: 3,
    })
  })

  it('add lane increments id when new_lane_1 already exists', () => {
    const { onAddLane } = renderPanel({
      lanes: {
        new_lane_1: { label: 'Existing', visibility: 'internal', order: 0 },
      },
    })

    fireEvent.click(screen.getByText('Add Lane'))

    expect(onAddLane).toHaveBeenCalledWith('new_lane_2', expect.objectContaining({
      label: 'New Lane',
    }))
  })

  it('add lane assigns order 0 when no lanes exist', () => {
    const { onAddLane } = renderPanel({ lanes: {} })

    fireEvent.click(screen.getByText('Add Lane'))

    expect(onAddLane).toHaveBeenCalledWith('new_lane_1', expect.objectContaining({
      order: 0,
    }))
  })

  it('edit label fires onUpdateLane', () => {
    const { onUpdateLane } = renderPanel()

    const input = screen.getByLabelText('Lane label for customer')
    fireEvent.change(input, { target: { value: 'Customer Actions' } })

    expect(onUpdateLane).toHaveBeenCalledOnce()
    expect(onUpdateLane).toHaveBeenCalledWith('customer', { label: 'Customer Actions' })
  })

  it('toggle visibility fires onUpdateLane with flipped value', () => {
    const { onUpdateLane } = renderPanel()

    // Customer lane is 'external', toggling should switch to 'internal'
    fireEvent.click(screen.getByLabelText('Toggle visibility for customer'))
    expect(onUpdateLane).toHaveBeenCalledWith('customer', { visibility: 'internal' })

    onUpdateLane.mockClear()

    // Support lane is 'internal', toggling should switch to 'external'
    fireEvent.click(screen.getByLabelText('Toggle visibility for support'))
    expect(onUpdateLane).toHaveBeenCalledWith('support', { visibility: 'external' })
  })

  it('delete lane fires onRemoveLane for lane without nodes', () => {
    const { onRemoveLane } = renderPanel()

    // 'support' lane has no nodes in baseDoc
    fireEvent.click(screen.getByLabelText('Delete support'))

    expect(onRemoveLane).toHaveBeenCalledOnce()
    expect(onRemoveLane).toHaveBeenCalledWith('support')
  })

  it('shows warning when deleting lane with nodes', () => {
    renderPanel()

    // 'customer' lane has nodes (start node)
    fireEvent.click(screen.getByLabelText('Delete customer'))

    expect(screen.getByText('This lane has nodes')).toBeTruthy()
  })

  it('deletes lane with nodes on second click after warning', () => {
    const { onRemoveLane } = renderPanel()

    // First click shows warning
    fireEvent.click(screen.getByLabelText('Delete customer'))
    expect(screen.getByText('This lane has nodes')).toBeTruthy()
    expect(onRemoveLane).not.toHaveBeenCalled()

    // Second click confirms deletion
    fireEvent.click(screen.getByLabelText('Delete customer'))
    expect(onRemoveLane).toHaveBeenCalledOnce()
    expect(onRemoveLane).toHaveBeenCalledWith('customer')
  })

  it('move up fires onReorderLanes with correct order', () => {
    const { onReorderLanes } = renderPanel()

    // Move 'support' (index 1) up
    fireEvent.click(screen.getByLabelText('Move support up'))

    expect(onReorderLanes).toHaveBeenCalledOnce()
    expect(onReorderLanes).toHaveBeenCalledWith(['support', 'customer', 'backend'])
  })

  it('move down fires onReorderLanes with correct order', () => {
    const { onReorderLanes } = renderPanel()

    // Move 'support' (index 1) down
    fireEvent.click(screen.getByLabelText('Move support down'))

    expect(onReorderLanes).toHaveBeenCalledOnce()
    expect(onReorderLanes).toHaveBeenCalledWith(['customer', 'backend', 'support'])
  })

  it('disables up button for first lane', () => {
    renderPanel()

    const upButton = screen.getByLabelText('Move customer up')
    expect(upButton).toHaveProperty('disabled', true)
  })

  it('disables down button for last lane', () => {
    renderPanel()

    const downButton = screen.getByLabelText('Move backend down')
    expect(downButton).toHaveProperty('disabled', true)
  })

  it('applies correct CSS classes', () => {
    const { container } = renderPanel()

    expect(container.querySelector('.fp-lane-panel')).toBeTruthy()
    expect(container.querySelector('.fp-lane-item')).toBeTruthy()
    expect(container.querySelector('.fp-lane-drag-handle')).toBeTruthy()
  })

  it('shows visibility text on toggle buttons', () => {
    renderPanel()

    expect(screen.getByLabelText('Toggle visibility for customer').textContent).toBe('external')
    expect(screen.getByLabelText('Toggle visibility for support').textContent).toBe('internal')
  })
})
