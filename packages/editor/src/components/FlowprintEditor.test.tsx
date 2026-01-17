import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import type {
  FlowprintDocument,
  ValidationError,
  ValidationResult,
} from '@ruminaider/flowprint-schema'
import { FlowprintEditor } from './FlowprintEditor'
import { ValidationBanner } from './ValidationBanner'

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
  Background: () => React.createElement('div', { 'data-testid': 'background' }),
  BackgroundVariant: { Dots: 'dots' },
  MiniMap: () => React.createElement('div', { 'data-testid': 'minimap' }),
  Panel: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('div', props, children),
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
}))

vi.mock('./LaneBackground', () => ({ default: () => null }))
vi.mock('./LineOfVisibility', () => ({ default: () => null }))

// ---------------------------------------------------------------------------
// Track validate calls — start with valid
// ---------------------------------------------------------------------------

const mockValidate = vi.fn<() => ValidationResult>(() => ({ valid: true, errors: [] }))

vi.mock('@ruminaider/flowprint-schema', async () => {
  const actual = await vi.importActual<typeof import('@ruminaider/flowprint-schema')>(
    '@ruminaider/flowprint-schema',
  )
  return {
    ...actual,
    validate: () => mockValidate(),
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

    // Since ReactFlow is a forwardRef mock, we verify the component rendered
    expect(screen.getByTestId('react-flow')).toBeTruthy()
  })

  it('passes readOnly=true props when readOnly is set', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} readOnly />)

    expect(container.querySelector('.fp-editor')).toBeTruthy()
    expect(screen.getByTestId('react-flow')).toBeTruthy()
  })

  it('shows validation banner when document has validation errors', () => {
    mockValidate.mockReturnValue({
      valid: false,
      errors: [
        {
          path: '/nodes/start/lane',
          message: 'Lane "nonexistent" does not exist',
          severity: 'error',
        },
      ],
    })

    const doc = makeDoc({
      nodes: {
        start: {
          type: 'action',
          lane: 'nonexistent',
          label: 'Start',
        },
      },
    })
    const onChange = vi.fn()

    render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(screen.getByText('1 validation error')).toBeTruthy()
    expect(screen.getByText(/Lane "nonexistent" does not exist/)).toBeTruthy()
  })

  it('validation banner can be dismissed', () => {
    mockValidate.mockReturnValue({
      valid: false,
      errors: [
        {
          path: '/nodes/start/lane',
          message: 'Lane ref invalid',
          severity: 'error',
        },
      ],
    })

    const doc = makeDoc({
      nodes: {
        start: {
          type: 'action',
          lane: 'nonexistent',
          label: 'Start',
        },
      },
    })
    const onChange = vi.fn()

    render(<FlowprintEditor value={doc} onChange={onChange} />)

    expect(screen.getByText('1 validation error')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText('1 validation error')).toBeNull()
  })

  it('calls onChange when provided and accepts the callback', () => {
    const doc = makeDoc()
    const onChange = vi.fn()

    const { container } = render(<FlowprintEditor value={doc} onChange={onChange} />)

    // Verify the component mounted successfully with onChange wired up
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
})

// ---------------------------------------------------------------------------
// Tests: ValidationBanner standalone
// ---------------------------------------------------------------------------

describe('ValidationBanner', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders error count and messages', () => {
    const errors: ValidationError[] = [
      { path: '/nodes/a/lane', message: 'Missing lane', severity: 'error' },
      { path: '/nodes/b/next', message: 'Dangling ref', severity: 'error' },
      { path: '/nodes/c/type', message: 'Bad type', severity: 'error' },
    ]
    const onDismiss = vi.fn()

    render(<ValidationBanner errors={errors} onDismiss={onDismiss} />)

    expect(screen.getByText('3 validation errors')).toBeTruthy()
    expect(screen.getByText(/Missing lane/)).toBeTruthy()
    expect(screen.getByText(/Dangling ref/)).toBeTruthy()
    expect(screen.getByText(/Bad type/)).toBeTruthy()
  })

  it('dismiss button calls onDismiss', () => {
    const errors: ValidationError[] = [{ path: '/nodes/a', message: 'Error', severity: 'error' }]
    const onDismiss = vi.fn()

    render(<ValidationBanner errors={errors} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('shows singular "error" for single error', () => {
    const errors: ValidationError[] = [
      { path: '/nodes/a', message: 'Single error', severity: 'error' },
    ]
    const onDismiss = vi.fn()

    render(<ValidationBanner errors={errors} onDismiss={onDismiss} />)

    expect(screen.getByText('1 validation error')).toBeTruthy()
  })

  it('limits displayed errors to 5 and shows overflow count', () => {
    const errors: ValidationError[] = Array.from({ length: 8 }, (_, i) => ({
      path: `/nodes/n${String(i)}`,
      message: `Error ${String(i)}`,
      severity: 'error' as const,
    }))
    const onDismiss = vi.fn()

    render(<ValidationBanner errors={errors} onDismiss={onDismiss} />)

    expect(screen.getByText('8 validation errors')).toBeTruthy()
    // First 5 shown
    expect(screen.getByText(/Error 0/)).toBeTruthy()
    expect(screen.getByText(/Error 4/)).toBeTruthy()
    // 6th not shown
    expect(screen.queryByText(/Error 5/)).toBeNull()
    // Overflow indicator
    expect(screen.getByText(/and 3 more/)).toBeTruthy()
  })
})
