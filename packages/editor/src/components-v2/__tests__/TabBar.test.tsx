import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TabBar } from '../TabBar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTabBar(overrides?: Partial<React.ComponentProps<typeof TabBar>>) {
  const defaults = {
    tabs: [
      { id: 'graph', label: 'Graph', type: 'graph', closable: false },
      { id: 'node-1', label: 'Action 1', type: 'action', closable: true },
    ],
    activeTabId: 'graph',
    onTabSelect: vi.fn(),
    onTabClose: vi.fn(),
    onTabCloseAll: vi.fn(),
    onTabCloseOthers: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<TabBar {...props} />), props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TabBar', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders Graph tab always', () => {
    renderTabBar({
      tabs: [{ id: 'graph', label: 'Graph', type: 'graph', closable: false }],
    })

    expect(screen.getByTestId('tab-graph')).toBeTruthy()
    expect(screen.getByText('Graph')).toBeTruthy()
  })

  it('active tab has .fp-tab--active class', () => {
    renderTabBar({ activeTabId: 'node-1' })

    const activeTab = screen.getByTestId('tab-node-1')
    expect(activeTab.classList.contains('fp-tab--active')).toBe(true)

    const graphTab = screen.getByTestId('tab-graph')
    expect(graphTab.classList.contains('fp-tab--active')).toBe(false)
  })

  it('close button fires onTabClose callback', () => {
    const { props } = renderTabBar({ activeTabId: 'node-1' })

    const closeBtn = screen.getByLabelText('Close Action 1')
    fireEvent.click(closeBtn)

    expect(props.onTabClose).toHaveBeenCalledWith('node-1')
  })

  it('Graph tab has no close button (closable=false)', () => {
    renderTabBar()

    const closeBtn = screen.queryByLabelText('Close Graph')
    expect(closeBtn).toBeNull()
  })

  it('tab click fires onTabSelect', () => {
    const { props } = renderTabBar()

    fireEvent.click(screen.getByTestId('tab-node-1'))
    expect(props.onTabSelect).toHaveBeenCalledWith('node-1')
  })
})
