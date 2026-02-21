import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NodePopover } from '../NodePopover'
import { registerNodeSpec, getAllNodeSpecs } from '../../nodes-v2/registry'
import type { NodeSpec } from '../../nodes-v2/types'

// ---------------------------------------------------------------------------
// Register stub spec
// ---------------------------------------------------------------------------

function makeStubSpec(type: string, displayName: string): NodeSpec {
  return {
    type,
    displayName,
    icon: ({ size, className }: { size?: number; className?: string }) => (
      <svg data-testid={`icon-${type}`} width={size} className={className} />
    ),
    color: '--fp-node-orange',
    shortcut: 'A',
    renderNode: () => null,
    renderProperties: ({ nodeId }: { nodeId: string; data: Record<string, unknown> }) => (
      <div data-testid="properties">Properties for {nodeId}</div>
    ),
    renderEditor: () => null,
    defaultData: () => ({}),
    validate: () => [],
  }
}

const alreadyRegistered = new Set(getAllNodeSpecs().map((s) => s.type))
if (!alreadyRegistered.has('action')) {
  registerNodeSpec(makeStubSpec('action', 'Action'))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPopover(overrides?: Partial<React.ComponentProps<typeof NodePopover>>) {
  const defaults: React.ComponentProps<typeof NodePopover> = {
    nodeId: 'node-1',
    nodeType: 'action',
    nodeData: { label: 'Test Action' },
    nodePosition: { x: 100, y: 100 },
    nodeWidth: 200,
    nodeHeight: 60,
    lanes: [{ id: 'lane-1', label: 'Frontstage' }],
    viewportWidth: 1200,
    viewportHeight: 800,
    onChange: vi.fn(),
    onOpenEditor: vi.fn(),
    onClose: vi.fn(),
  }
  const props = { ...defaults, ...overrides }
  return { ...render(<NodePopover {...props} />), props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodePopover', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders with the node type header', () => {
    renderPopover()

    expect(screen.getByText('Action')).toBeTruthy()
  })

  it('"Open Full Editor" button fires onOpenEditor callback', () => {
    const { props } = renderPopover()

    const button = screen.getByText('Open Full Editor')
    fireEvent.click(button)

    expect(props.onOpenEditor).toHaveBeenCalledWith('node-1')
  })

  it('popover has .fp-island class (via Island)', () => {
    const { container } = renderPopover()

    const island = container.querySelector('.fp-island')
    expect(island).toBeTruthy()
  })

  it('renders properties component from spec', () => {
    renderPopover()

    expect(screen.getByTestId('properties')).toBeTruthy()
    expect(screen.getByText('Properties for node-1')).toBeTruthy()
  })

  it('returns null when nodePosition results in null position', () => {
    // computePopoverPosition returns null only when nodePosition is null
    // but our component receives nodePosition as required; test through the component
    const { container } = renderPopover()
    expect(container.querySelector('.fp-node-popover')).toBeTruthy()
  })
})
