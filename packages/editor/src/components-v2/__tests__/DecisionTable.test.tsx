import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DecisionTable } from '../DecisionTable'
import type { RulesData } from '../DecisionTable'

afterEach(() => {
  cleanup()
})

const sampleRules: RulesData = {
  hit_policy: 'first',
  inputs: ['order.total_amount', 'customer.tier'],
  rules: [
    {
      when: {
        'order.total_amount': { gte: 100 },
        'customer.tier': { in: ['gold', 'platinum'] },
      },
      then: { discount: 0.2, label: 'VIP discount' },
    },
    {
      when: {
        'order.total_amount': { gte: 50 },
      },
      then: { discount: 0.1, label: 'Standard discount' },
    },
    {
      then: { discount: 0, label: 'No discount' },
    },
  ],
}

describe('DecisionTable', () => {
  it('renders rows and columns from rules data', () => {
    render(<DecisionTable rules={sampleRules} />)

    // Should have 3 rule rows
    expect(screen.getByTestId('rule-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('rule-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('rule-row-2')).toBeInTheDocument()

    // Should have condition column headers
    expect(screen.getByText('order.total_amount')).toBeInTheDocument()
    expect(screen.getByText('customer.tier')).toBeInTheDocument()

    // Should have output column headers
    expect(screen.getByText('discount')).toBeInTheDocument()
    expect(screen.getByText('label')).toBeInTheDocument()
  })

  it('shows operator badges with correct symbols', () => {
    render(<DecisionTable rules={sampleRules} />)

    // gte (>=) for 100
    expect(screen.getByText('\u2265 100')).toBeInTheDocument()
    // in for [gold, platinum]
    expect(screen.getByText('\u2208 [gold, platinum]')).toBeInTheDocument()
    // gte (>=) for 50
    expect(screen.getByText('\u2265 50')).toBeInTheDocument()
  })

  it('shows wildcard cells as em-dash', () => {
    render(<DecisionTable rules={sampleRules} />)

    // Rule 1 (index 1) has no customer.tier -> wildcard
    // Rule 2 (index 2) has no when at all -> all wildcards
    const wildcards = document.querySelectorAll('.fp-decision-table__wildcard')
    // Row 1: customer.tier is wildcard (1)
    // Row 2: both columns are wildcards (2)
    expect(wildcards.length).toBe(3)
    // Each shows em-dash
    for (const el of wildcards) {
      expect(el.textContent).toBe('\u2014')
    }
  })

  it('shows hit policy badge', () => {
    render(<DecisionTable rules={sampleRules} />)

    const badge = screen.getByTestId('hit-policy-badge')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('first')
  })

  it('handles empty rules array', () => {
    const emptyRules: RulesData = {
      hit_policy: 'collect',
      rules: [],
    }
    render(<DecisionTable rules={emptyRules} />)

    expect(screen.getByText('No rules defined')).toBeInTheDocument()
    expect(screen.getByTestId('hit-policy-badge')).toHaveTextContent('collect')
  })
})
