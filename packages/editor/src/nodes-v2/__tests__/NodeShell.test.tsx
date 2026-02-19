import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { NodeShell } from '../NodeShell'
import { Zap } from 'lucide-react'

/* @xyflow/react Handle renders a div with data-handleid in real usage,
   but in jsdom we need to mock it so the component renders without errors. */
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Left: 'left', Right: 'right' },
}))

describe('NodeShell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders with correct root class and data attributes', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-1"
        type="action"
        label="My Action"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    const root = container.querySelector('.fp-node')
    expect(root).toBeTruthy()
    expect(root?.getAttribute('data-node-type')).toBe('action')
    expect(root?.getAttribute('data-testid')).toBe('node-test-1')
  })

  it('applies color CSS custom properties', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-2"
        type="action"
        label="Colored"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    const root = container.querySelector('.fp-node') as HTMLElement
    expect(root.style.getPropertyValue('--node-accent')).toBe(
      'var(--fp-node-orange)',
    )
    expect(root.style.getPropertyValue('--node-accent-subtle')).toBe(
      'var(--fp-node-orange-subtle)',
    )
  })

  it('renders header with icon, label, and menu', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-3"
        type="action"
        label="Header Test"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node__icon')).toBeTruthy()
    expect(container.querySelector('.fp-node__name')?.textContent).toBe(
      'Header Test',
    )
    expect(container.querySelector('.fp-node__menu')).toBeTruthy()
  })

  it('shows body when description is provided', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-4"
        type="action"
        label="With Desc"
        description="A description"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    const body = container.querySelector('.fp-node__body')
    expect(body).toBeTruthy()
    expect(body?.textContent).toBe('A description')
  })

  it('hides body when description is not provided', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-5"
        type="action"
        label="No Desc"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node__body')).toBeNull()
  })

  it('renders both handle elements', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-6"
        type="action"
        label="Handles"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('[data-testid="handle-target"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="handle-source"]')).toBeTruthy()
  })

  it('adds selected class when selected', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-7"
        type="action"
        label="Selected"
        selected
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node--selected')).toBeTruthy()
  })

  it('does not add selected class when not selected', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-8"
        type="action"
        label="Not Selected"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node--selected')).toBeNull()
  })

  it('adds unassigned class when isUnassigned', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-9"
        type="action"
        label="Unassigned"
        isUnassigned
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node--unassigned')).toBeTruthy()
  })

  it('adds error class when hasError', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-10"
        type="action"
        label="Error"
        hasError
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node--error')).toBeTruthy()
  })

  it('renders children when provided', () => {
    const { container } = render(
      <NodeShell
        nodeId="test-11"
        type="action"
        label="With Children"
        colorVar="--fp-node-orange"
        icon={Zap}
      >
        <div data-testid="child-content">Extra content</div>
      </NodeShell>,
    )
    expect(container.querySelector('[data-testid="child-content"]')).toBeTruthy()
  })

  it('calls onMenuClick when menu is clicked', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <NodeShell
        nodeId="test-12"
        type="action"
        label="Menu Click"
        colorVar="--fp-node-orange"
        icon={Zap}
        onMenuClick={handleClick}
      />,
    )
    const menu = container.querySelector('.fp-node__menu') as HTMLElement
    menu.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
