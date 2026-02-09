import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PanelSidebar } from './PanelSidebar'
import type { SidebarTab } from './PanelSidebar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSidebar(overrides?: {
  activeTab?: SidebarTab | null
  onTabChange?: (tab: SidebarTab | null) => void
  showYamlTab?: boolean
}) {
  const onTabChange = overrides?.onTabChange ?? vi.fn()
  const activeTab = overrides && 'activeTab' in overrides ? overrides.activeTab : 'properties'
  return render(
    <PanelSidebar
      activeTab={activeTab ?? null}
      onTabChange={onTabChange}
      showYamlTab={overrides?.showYamlTab ?? true}
    >
      {{
        properties: <div data-testid="panel-properties">Properties content</div>,
        lanes: <div data-testid="panel-lanes">Lanes content</div>,
        yaml: <div data-testid="panel-yaml">YAML content</div>,
      }}
    </PanelSidebar>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PanelSidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders tab buttons for all three tabs', () => {
    renderSidebar()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
  })

  it('shows Properties content when properties tab is active', () => {
    renderSidebar({ activeTab: 'properties' })

    expect(screen.getByTestId('panel-properties')).toBeTruthy()
    expect(screen.queryByTestId('panel-lanes')).toBeNull()
    expect(screen.queryByTestId('panel-yaml')).toBeNull()
  })

  it('shows Lanes content when lanes tab is active', () => {
    renderSidebar({ activeTab: 'lanes' })

    expect(screen.getByTestId('panel-lanes')).toBeTruthy()
    expect(screen.queryByTestId('panel-properties')).toBeNull()
  })

  it('shows YAML content when yaml tab is active', () => {
    renderSidebar({ activeTab: 'yaml' })

    expect(screen.getByTestId('panel-yaml')).toBeTruthy()
    expect(screen.queryByTestId('panel-properties')).toBeNull()
  })

  it('clicking inactive tab calls onTabChange with that tab', () => {
    const onTabChange = vi.fn()
    renderSidebar({ activeTab: 'properties', onTabChange })

    const lanesTab = screen.getByTitle('Lanes')
    fireEvent.click(lanesTab)

    expect(onTabChange).toHaveBeenCalledWith('lanes')
  })

  it('clicking active tab collapses sidebar (calls onTabChange with null)', () => {
    const onTabChange = vi.fn()
    renderSidebar({ activeTab: 'properties', onTabChange })

    const propertiesTab = screen.getByTitle('Properties')
    fireEvent.click(propertiesTab)

    expect(onTabChange).toHaveBeenCalledWith(null)
  })

  it('hides YAML tab when showYamlTab is false', () => {
    renderSidebar({ showYamlTab: false })

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(screen.queryByTitle('YAML Preview')).toBeNull()
  })

  it('sets aria-selected on the active tab', () => {
    renderSidebar({ activeTab: 'lanes' })

    const lanesTab = screen.getByTitle('Lanes')
    const propertiesTab = screen.getByTitle('Properties')

    expect(lanesTab.getAttribute('aria-selected')).toBe('true')
    expect(propertiesTab.getAttribute('aria-selected')).toBe('false')
  })

  it('adds collapsed class when activeTab is null', () => {
    const { container } = renderSidebar({ activeTab: null })

    expect(container.querySelector('.fp-sidebar--collapsed')).toBeTruthy()
  })

  it('does not add collapsed class when a tab is active', () => {
    const { container } = renderSidebar({ activeTab: 'properties' })

    expect(container.querySelector('.fp-sidebar--collapsed')).toBeNull()
  })
})
