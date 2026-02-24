import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import type {
  FlowprintDocument,
  ValidationResult,
} from '@ruminaider/flowprint-schema'
import { FlowprintEditor } from './FlowprintEditor'

// ---------------------------------------------------------------------------
// matchMedia polyfill for jsdom (needed by useTheme)
// ---------------------------------------------------------------------------

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@xyflow/react', () => ({
  ReactFlow: React.forwardRef(function MockReactFlow(
    props: Record<string, unknown>,
    ref: React.Ref<HTMLDivElement>,
  ) {
    return React.createElement(
      'div',
      { 'data-testid': 'react-flow', ref },
      props.children as React.ReactNode,
    )
  }),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow-provider' }, children),
  Background: () => React.createElement('div', { 'data-testid': 'background' }),
  BackgroundVariant: { Dots: 'dots' },
  MiniMap: () => React.createElement('div', { 'data-testid': 'minimap' }),
  Panel: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('div', props, children),
  useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  useReactFlow: () => ({
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitView: vi.fn(),
    getZoom: () => 1,
    setViewport: vi.fn(),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    flowToScreenPosition: (pos: { x: number; y: number }) => pos,
    screenToFlowPosition: (pos: { x: number; y: number }) => pos,
  }),
  useOnViewportChange: vi.fn(),
  ViewportPortal: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'viewport-portal' }, children),
}))

vi.mock('../layout', () => ({
  computeLayout: vi.fn(() => ({
    nodes: [],
    edges: [],
    lanes: [],
    lineOfVisibilityY: null,
    width: 800,
    height: 600,
  })),
  computeEdges: vi.fn(() => []),
  computeLaneBands: vi.fn(() => ({ bands: [], lineOfVisibilityY: null })),
  autoLayout: vi.fn(() => new Map()),
}))

vi.mock('../nodes/specs', () => ({
  nodeTypes: {},
}))

vi.mock('../nodes/registry', () => ({
  registerNodeSpec: vi.fn(),
  getNodeSpec: () => null,
  getAllNodeSpecs: () => [],
  getNodeSpecOrThrow: () => {
    throw new Error('not found')
  },
}))

vi.mock('../edges', () => ({
  edgeTypes: {},
}))

vi.mock('./LaneBackground', () => ({
  LaneBackground: () => null,
}))

// ---------------------------------------------------------------------------
// Track validate calls -- start with valid
// ---------------------------------------------------------------------------

const mockValidate = vi.fn<() => ValidationResult>(() => ({ valid: true, errors: [] }))

vi.mock('@ruminaider/flowprint-schema', async () => {
  const actual = await vi.importActual<typeof import('@ruminaider/flowprint-schema')>(
    '@ruminaider/flowprint-schema',
  )
  return {
    ...actual,
    validate: () => mockValidate(),
    serialize: () => 'schema: flowprint/1.0\nname: test',
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(overrides?: Partial<FlowprintDocument>): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes: { frontend: { label: 'Frontend', visibility: 'external' as const, order: 0 } },
    nodes: {},
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests: FlowprintEditor
// ---------------------------------------------------------------------------

describe('FlowprintEditor', () => {
  beforeEach(() => {
    mockValidate.mockReturnValue({ valid: true, errors: [] })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders without crashing with a valid document', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(container.querySelector('.fp-editor')).toBeTruthy()
    expect(screen.getByTestId('react-flow')).toBeTruthy()
  })

  it('passes interactive props by default (readOnly=false)', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(screen.getByTestId('react-flow')).toBeTruthy()
  })

  it('passes readOnly=true props when readOnly is set', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} readOnly />)

    expect(container.querySelector('.fp-editor')).toBeTruthy()
    expect(screen.getByTestId('react-flow')).toBeTruthy()
  })

  it('calls onChange when provided and accepts the callback', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(container.querySelector('.fp-editor')).toBeTruthy()
  })

  it('shows minimap and grid by default', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(screen.getByTestId('minimap')).toBeTruthy()
    expect(screen.getByTestId('background')).toBeTruthy()
  })

  it('hides minimap and grid when disabled', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    render(<FlowprintEditor value={doc} onChange={onChange} showMinimap={false} showGrid={false} />)

    expect(screen.queryByTestId('minimap')).toBeNull()
    expect(screen.queryByTestId('background')).toBeNull()
  })

  it('applies custom className', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(
      <FlowprintEditor value={doc} onChange={onChange} className="my-custom" />,
    )

    const el = container.querySelector('.fp-editor')
    expect(el?.className).toContain('my-custom')
  })

  it('renders TabBar with Graph tab', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(container.querySelector('.fp-tab-bar')).toBeTruthy()
    expect(screen.getByText('Graph')).toBeTruthy()
  })

  it('renders Toolbar when not readOnly', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(container.querySelector('.fp-toolbar')).toBeTruthy()
  })

  it('hides Toolbar in readOnly mode', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} readOnly />)

    expect(container.querySelector('.fp-toolbar')).toBeNull()
  })

  it('renders ZoomControls', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(container.querySelector('.fp-zoom-controls')).toBeTruthy()
  })
})
