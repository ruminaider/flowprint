import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { actionSpec } from '../action'

afterEach(() => {
  cleanup()
})

const ActionProperties = actionSpec.renderProperties
const ActionEditor = actionSpec.renderEditor

const baseLanes = [{ id: 'lane-1', label: 'Frontstage' }]

describe('ActionProperties - rules UI', () => {
  it('shows rules file reference when data.rules is set', () => {
    render(
      <ActionProperties
        nodeId="action-1"
        data={{
          type: 'action',
          rules: { file: 'order-rules.rules.yaml', evaluator: 'builtin' },
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('rules-file-label')).toHaveTextContent(
      'Rules: order-rules.rules.yaml',
    )
  })

  it('shows entry points summary when entry_points exist', () => {
    render(
      <ActionProperties
        nodeId="action-1"
        data={{
          type: 'action',
          entry_points: [{ name: 'ep1' }, { name: 'ep2' }],
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('entry-points-summary')).toHaveTextContent('2 entry points')
  })

  it('shows "No configuration" when neither rules nor entry_points', () => {
    render(
      <ActionProperties
        nodeId="action-1"
        data={{ type: 'action' }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('no-configuration')).toHaveTextContent('No configuration')
  })
})

describe('ActionEditor - rules UI', () => {
  it('renders RulesRefEditor and RulesPreview when data.rules is set', () => {
    render(
      <ActionEditor
        nodeId="action-1"
        data={{
          type: 'action',
          rules: { file: 'order.rules.yaml', evaluator: 'builtin' },
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('rules-ref-editor')).toBeInTheDocument()
    expect(screen.getByTestId('rules-preview')).toBeInTheDocument()
    expect(screen.getByTestId('rules-file-input')).toHaveValue('order.rules.yaml')
  })

  it('shows entry points placeholder when no rules', () => {
    render(
      <ActionEditor
        nodeId="action-1"
        data={{
          type: 'action',
          entry_points: [],
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('entry-points-placeholder')).toBeInTheDocument()
    expect(screen.queryByTestId('rules-preview')).not.toBeInTheDocument()
  })

  it('switching to rules mode clears entry_points and sets rules', () => {
    const onChange = vi.fn()
    render(
      <ActionEditor
        nodeId="action-1"
        data={{
          type: 'action',
          entry_points: [{ name: 'ep1' }],
        }}
        lanes={baseLanes}
        onChange={onChange}
      />,
    )

    // Toggle to rules mode
    fireEvent.click(screen.getByTestId('toggle-rules'))

    expect(onChange).toHaveBeenCalledTimes(1)
    const call = onChange.mock.calls[0] as unknown[]
    const updatedData = call[0] as Record<string, unknown>
    expect(updatedData.rules).toEqual({ file: '', evaluator: 'builtin' })
    expect(updatedData.entry_points).toBeUndefined()
  })

  it('switching from rules mode restores entry_points and clears rules', () => {
    const onChange = vi.fn()
    render(
      <ActionEditor
        nodeId="action-1"
        data={{
          type: 'action',
          rules: { file: 'test.rules.yaml', evaluator: 'builtin' },
        }}
        lanes={baseLanes}
        onChange={onChange}
      />,
    )

    // Toggle away from rules mode
    fireEvent.click(screen.getByTestId('toggle-alternate'))

    expect(onChange).toHaveBeenCalledTimes(1)
    const call = onChange.mock.calls[0] as unknown[]
    const updatedData = call[0] as Record<string, unknown>
    expect(updatedData.rules).toBeUndefined()
    expect(updatedData.entry_points).toEqual([])
  })
})
