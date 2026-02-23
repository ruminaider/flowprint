import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Toolbar } from '../Toolbar'
import { registerNodeSpec, getAllNodeSpecs } from '../../nodes/registry'
import type { NodeSpec } from '../../nodes/types'

// ---------------------------------------------------------------------------
// Register stub specs for testing (simulates what specs/index would do)
// ---------------------------------------------------------------------------

function makeStubSpec(type: string, displayName: string, shortcut: string, color: string): NodeSpec {
  return {
    type,
    displayName,
    icon: ({ size, className }: { size?: number; className?: string }) => (
      <svg data-testid={`icon-${type}`} width={size} className={className} />
    ),
    color,
    shortcut,
    renderNode: () => null,
    renderProperties: () => null,
    renderEditor: () => null,
    defaultData: () => ({}),
    validate: () => [],
  }
}

// Register once before tests (these persist in the module-level Map)
const stubSpecs = [
  makeStubSpec('action', 'Action', 'A', '--fp-node-orange'),
  makeStubSpec('switch', 'Switch', 'S', '--fp-node-purple'),
  makeStubSpec('terminal', 'Terminal', 'T', '--fp-node-red'),
]

// Only register if not already present (registry is module-scoped)
const alreadyRegistered = new Set(getAllNodeSpecs().map((s) => s.type))
for (const spec of stubSpecs) {
  if (!alreadyRegistered.has(spec.type)) {
    registerNodeSpec(spec)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderToolbar(overrides?: Partial<React.ComponentProps<typeof Toolbar>>) {
  const defaults = {
    activeTool: 'select',
    onToolChange: vi.fn(),
    onAddNode: vi.fn(),
    onCommandPalette: vi.fn(),
    onTidyLayout: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<Toolbar {...props} />), props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Toolbar', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders all registered node types', () => {
    renderToolbar()

    for (const spec of stubSpecs) {
      expect(screen.getByLabelText(spec.displayName)).toBeTruthy()
    }
  })

  it('renders navigation tools (Select and Hand)', () => {
    renderToolbar()

    expect(screen.getByLabelText('Select')).toBeTruthy()
    expect(screen.getByLabelText('Hand')).toBeTruthy()
  })

  it('renders utility buttons (Command Palette and Tidy Layout)', () => {
    renderToolbar()

    expect(screen.getByLabelText('Command Palette')).toBeTruthy()
    expect(screen.getByLabelText('Tidy Layout')).toBeTruthy()
  })

  it('applies --active class to the active tool', () => {
    renderToolbar({ activeTool: 'select' })

    const selectBtn = screen.getByLabelText('Select')
    expect(selectBtn.classList.contains('fp-toolbar__button--active')).toBe(true)

    const handBtn = screen.getByLabelText('Hand')
    expect(handBtn.classList.contains('fp-toolbar__button--active')).toBe(false)
  })

  it('applies --active class to hand tool when active', () => {
    renderToolbar({ activeTool: 'hand' })

    const handBtn = screen.getByLabelText('Hand')
    expect(handBtn.classList.contains('fp-toolbar__button--active')).toBe(true)

    const selectBtn = screen.getByLabelText('Select')
    expect(selectBtn.classList.contains('fp-toolbar__button--active')).toBe(false)
  })

  it('calls onToolChange when navigation tool is clicked', () => {
    const { props } = renderToolbar()

    fireEvent.click(screen.getByLabelText('Hand'))
    expect(props.onToolChange).toHaveBeenCalledWith('hand')

    fireEvent.click(screen.getByLabelText('Select'))
    expect(props.onToolChange).toHaveBeenCalledWith('select')
  })

  it('calls onAddNode when a node type button is clicked', () => {
    const { props } = renderToolbar()

    fireEvent.click(screen.getByLabelText('Action'))
    expect(props.onAddNode).toHaveBeenCalledWith('action')

    fireEvent.click(screen.getByLabelText('Switch'))
    expect(props.onAddNode).toHaveBeenCalledWith('switch')
  })

  it('calls onCommandPalette when Command Palette button is clicked', () => {
    const { props } = renderToolbar()

    fireEvent.click(screen.getByLabelText('Command Palette'))
    expect(props.onCommandPalette).toHaveBeenCalledOnce()
  })

  it('calls onTidyLayout when Tidy Layout button is clicked', () => {
    const { props } = renderToolbar()

    fireEvent.click(screen.getByLabelText('Tidy Layout'))
    expect(props.onTidyLayout).toHaveBeenCalledOnce()
  })

  it('renders tooltip with correct text including shortcut', () => {
    renderToolbar()

    const tooltips = screen.getAllByRole('tooltip')
    const tooltipTexts = tooltips.map((t) => t.textContent)

    expect(tooltipTexts).toContain('Select (V)')
    expect(tooltipTexts).toContain('Hand (H)')
    expect(tooltipTexts).toContain('Command Palette (Cmd+K)')
  })

  it('renders tooltip for node type buttons with shortcut', () => {
    renderToolbar()

    const tooltips = screen.getAllByRole('tooltip')
    const tooltipTexts = tooltips.map((t) => t.textContent)

    expect(tooltipTexts).toContain('Action (A)')
    expect(tooltipTexts).toContain('Switch (S)')
  })

  it('wraps content in Island with fp-toolbar class', () => {
    const { container } = renderToolbar()

    const island = container.querySelector('.fp-island.fp-toolbar')
    expect(island).toBeTruthy()
  })

  it('renders dividers between groups', () => {
    const { container } = renderToolbar()

    const dividers = container.querySelectorAll('.fp-toolbar__divider')
    expect(dividers.length).toBe(2)
  })
})
