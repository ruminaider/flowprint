import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { ErrorBoundary } from './ErrorBoundary'

vi.mock('@ruminaider/flowprint-schema', () => ({
  serialize: vi.fn(() => 'schema: flowprint/1.0\nname: test\n'),
  validate: vi.fn(() => ({
    valid: false,
    errors: [
      { path: '/nodes/start/next', message: 'Dangling reference', severity: 'error' },
      { path: '/lanes', message: 'Unused lane', severity: 'warning' },
    ],
  })),
}))

const testDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test',
  version: '1.0.0',
  lanes: {
    external: { label: 'External', visibility: 'external', order: 0 },
  },
  nodes: {
    start: {
      type: 'action',
      lane: 'external',
      label: 'Start',
      next: 'end',
    },
  },
}

function ThrowingChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <div>Child content</div>
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
  })

  it('renders children normally when no error', () => {
    render(
      <ErrorBoundary doc={testDoc}>
        <div>Normal content</div>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Normal content')).toBeTruthy()
  })

  it('catches rendering error from child component', () => {
    render(
      <ErrorBoundary doc={testDoc}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeTruthy()
  })

  it('shows error message in fallback', () => {
    render(
      <ErrorBoundary doc={testDoc}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Test render error')).toBeTruthy()
  })

  it('shows YAML preview via serialize', () => {
    const { container } = render(
      <ErrorBoundary doc={testDoc}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    const yamlPreview = container.querySelector('.fp-error-yaml-preview')
    expect(yamlPreview).toBeTruthy()
    expect(yamlPreview!.textContent).toBe('schema: flowprint/1.0\nname: test\n')
  })

  it('shows validation errors', () => {
    render(
      <ErrorBoundary doc={testDoc}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Validation Errors')).toBeTruthy()
    expect(screen.getByText(/Dangling reference/)).toBeTruthy()
    expect(screen.getByText(/Unused lane/)).toBeTruthy()
  })

  it('reset button clears error and re-mounts children', () => {
    const onReset = vi.fn()

    const { rerender } = render(
      <ErrorBoundary doc={testDoc} onReset={onReset}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeTruthy()

    // Re-render with a non-throwing child before clicking reset,
    // so after state clears the children render successfully
    rerender(
      <ErrorBoundary doc={testDoc} onReset={onReset}>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(onReset).toHaveBeenCalledOnce()
    expect(screen.getByText('Child content')).toBeTruthy()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('applies correct CSS classes', () => {
    const { container } = render(
      <ErrorBoundary doc={testDoc}>
        <ThrowingChild />
      </ErrorBoundary>,
    )

    expect(container.querySelector('.fp-error-boundary')).toBeTruthy()
    expect(container.querySelector('.fp-error-fallback')).toBeTruthy()
    expect(container.querySelector('.fp-error-yaml-preview')).toBeTruthy()
  })
})
