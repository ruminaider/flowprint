import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LaneHeader } from '../LaneHeader'

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

describe('LaneHeader – data classification badges', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows data classification badges when dataClass is provided', () => {
    const { container } = renderLaneHeader({ dataClass: ['pii', 'financial'] })

    const badges = container.querySelector('[data-testid="data-class-badges"]')
    expect(badges).toBeTruthy()
    expect(container.querySelector('[data-testid="data-badge-pii"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="data-badge-financial"]')).toBeTruthy()
  })

  it('shows badges at 100% opacity (lane-level is always explicit)', () => {
    const { container } = renderLaneHeader({ dataClass: ['credentials'] })

    const badge = container.querySelector('[data-testid="data-badge-credentials"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('1')
    expect(badge?.getAttribute('data-inherited')).toBeNull()
  })

  it('does not show badges when dataClass is not provided', () => {
    const { container } = renderLaneHeader()

    expect(container.querySelector('[data-testid="data-class-badges"]')).toBeNull()
  })

  it('does not show badges when dataClass is empty array', () => {
    const { container } = renderLaneHeader({ dataClass: [] })

    expect(container.querySelector('[data-testid="data-class-badges"]')).toBeNull()
  })

  it('still renders lane name alongside badges', () => {
    renderLaneHeader({ dataClass: ['internal'] })

    expect(screen.getByText('Customer Actions')).toBeTruthy()
    expect(screen.getByLabelText('Collapse lane')).toBeTruthy()
  })
})
