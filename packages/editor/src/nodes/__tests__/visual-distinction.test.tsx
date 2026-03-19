import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { NodeShell } from '../NodeShell'
import { Zap } from 'lucide-react'
import { CalculatorIcon, TableIcon } from '../../components/icons'

vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Left: 'left', Right: 'right' },
}))

describe('NodeShell – action mode icons', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders Calculator icon when passed as icon prop (expressions/transform mode)', () => {
    const { container } = render(
      <NodeShell
        nodeId="expr-1"
        type="action"
        label="Calculate Total"
        subtitle="Transform"
        colorVar="--fp-node-orange"
        icon={CalculatorIcon}
      />,
    )
    const icon = container.querySelector('.fp-node__icon svg')
    expect(icon).toBeTruthy()
    // Calculator icon has a rect element
    expect(icon?.querySelector('rect')).toBeTruthy()
  })

  it('renders Table icon when passed as icon prop (rules/decision-table mode)', () => {
    const { container } = render(
      <NodeShell
        nodeId="rules-1"
        type="action"
        label="Evaluate Pricing"
        subtitle="Decision Table"
        colorVar="--fp-node-orange"
        icon={TableIcon}
      />,
    )
    const icon = container.querySelector('.fp-node__icon svg')
    expect(icon).toBeTruthy()
    // Table icon has a rect element too
    expect(icon?.querySelector('rect')).toBeTruthy()
  })

  it('renders Zap icon for default handler mode', () => {
    const { container } = render(
      <NodeShell
        nodeId="handler-1"
        type="action"
        label="Process Order"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    const icon = container.querySelector('.fp-node__icon svg')
    expect(icon).toBeTruthy()
  })

  it('renders subtitle text when provided', () => {
    const { container } = render(
      <NodeShell
        nodeId="sub-1"
        type="action"
        label="Calculate Total"
        subtitle="Transform"
        colorVar="--fp-node-orange"
        icon={CalculatorIcon}
      />,
    )
    const subtitle = container.querySelector('[data-testid="node-subtitle"]')
    expect(subtitle).toBeTruthy()
    expect(subtitle?.textContent).toBe('Transform')
  })

  it('does not render subtitle when not provided', () => {
    const { container } = render(
      <NodeShell
        nodeId="no-sub-1"
        type="action"
        label="Process Order"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('[data-testid="node-subtitle"]')).toBeNull()
  })
})

describe('NodeShell – data classification badges', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows shield badge for node with pii data_class', () => {
    const { container } = render(
      <NodeShell
        nodeId="pii-1"
        type="action"
        label="Collect Info"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['pii']}
      />,
    )
    const badge = container.querySelector('[data-testid="data-badge-pii"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('1')
  })

  it('shows landmark badge for node with financial data_class', () => {
    const { container } = render(
      <NodeShell
        nodeId="fin-1"
        type="action"
        label="Process Payment"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['financial']}
      />,
    )
    const badge = container.querySelector('[data-testid="data-badge-financial"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('1')
  })

  it('shows key badge for node with credentials data_class', () => {
    const { container } = render(
      <NodeShell
        nodeId="cred-1"
        type="action"
        label="Auth"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['credentials']}
      />,
    )
    const badge = container.querySelector('[data-testid="data-badge-credentials"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('1')
  })

  it('shows eye badge for node with internal data_class', () => {
    const { container } = render(
      <NodeShell
        nodeId="int-1"
        type="action"
        label="Log Data"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['internal']}
      />,
    )
    const badge = container.querySelector('[data-testid="data-badge-internal"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('1')
  })

  it('shows inherited badge at 50% opacity when classification comes from lane', () => {
    const { container } = render(
      <NodeShell
        nodeId="inherit-1"
        type="action"
        label="Process"
        colorVar="--fp-node-orange"
        icon={Zap}
        laneDataClass={['financial']}
      />,
    )
    const badge = container.querySelector('[data-testid="data-badge-financial"]')
    expect(badge).toBeTruthy()
    expect((badge as HTMLElement).style.opacity).toBe('0.5')
    expect(badge?.getAttribute('data-inherited')).toBe('true')
  })

  it('shows explicit badge at 100% when node has classification even if lane also has it', () => {
    const { container } = render(
      <NodeShell
        nodeId="both-1"
        type="action"
        label="Process"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['pii']}
        laneDataClass={['pii', 'financial']}
      />,
    )
    // pii: explicit (from node) -> opacity 1
    const piiBadge = container.querySelector('[data-testid="data-badge-pii"]')
    expect(piiBadge).toBeTruthy()
    expect((piiBadge as HTMLElement).style.opacity).toBe('1')

    // financial: inherited (from lane only) -> opacity 0.5
    const finBadge = container.querySelector('[data-testid="data-badge-financial"]')
    expect(finBadge).toBeTruthy()
    expect((finBadge as HTMLElement).style.opacity).toBe('0.5')
  })

  it('shows multiple badges for multiple classifications', () => {
    const { container } = render(
      <NodeShell
        nodeId="multi-1"
        type="action"
        label="Multi"
        colorVar="--fp-node-orange"
        icon={Zap}
        dataClass={['pii', 'financial', 'credentials']}
      />,
    )
    const badges = container.querySelector('[data-testid="data-class-badges"]')
    expect(badges).toBeTruthy()
    expect(badges?.children.length).toBe(3)
  })

  it('does not render badges container when no classifications', () => {
    const { container } = render(
      <NodeShell
        nodeId="none-1"
        type="action"
        label="No Class"
        colorVar="--fp-node-orange"
        icon={Zap}
      />,
    )
    expect(container.querySelector('.fp-node__badges')).toBeNull()
  })
})
