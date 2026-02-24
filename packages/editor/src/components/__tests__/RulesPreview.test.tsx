import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { RulesPreview } from '../RulesPreview'
import type { RulesData } from '../DecisionTable'

afterEach(() => {
  cleanup()
})

const sampleRulesData: RulesData = {
  hit_policy: 'first',
  inputs: ['amount'],
  rules: [
    {
      when: { amount: { gte: 100 } },
      then: { discount: 0.2 },
    },
  ],
}

describe('RulesPreview', () => {
  it('renders DecisionTable when rulesData is provided', () => {
    render(
      <RulesPreview
        rulesRef={{ file: 'order.rules.yaml' }}
        rulesData={sampleRulesData}
      />,
    )

    expect(screen.getByTestId('rules-preview')).toBeInTheDocument()
    expect(screen.getByTestId('decision-table')).toBeInTheDocument()
    expect(screen.getByText('order.rules.yaml')).toBeInTheDocument()
  })

  it('shows empty state when no rulesData is provided', () => {
    render(
      <RulesPreview
        rulesRef={{ file: 'missing.rules.yaml' }}
      />,
    )

    expect(screen.getByTestId('rules-preview-empty')).toBeInTheDocument()
    expect(screen.getByText('No rules data available')).toBeInTheDocument()
  })

  it('shows validation errors when present', () => {
    render(
      <RulesPreview
        rulesRef={{ file: 'bad.rules.yaml' }}
        validationErrors={['Missing hit_policy field', 'Invalid operator in rule 2']}
      />,
    )

    const status = screen.getByTestId('rules-validation-status')
    expect(status).toHaveTextContent('Invalid')

    const errors = screen.getByTestId('rules-validation-errors')
    expect(errors).toBeInTheDocument()
    expect(screen.getByText('Missing hit_policy field')).toBeInTheDocument()
    expect(screen.getByText('Invalid operator in rule 2')).toBeInTheDocument()
  })
})
