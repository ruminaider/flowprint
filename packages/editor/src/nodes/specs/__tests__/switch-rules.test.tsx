import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { switchSpec } from '../switch'

afterEach(() => {
  cleanup()
})

const SwitchProperties = switchSpec.renderProperties
const SwitchEditor = switchSpec.renderEditor

const baseLanes = [{ id: 'lane-1', label: 'Frontstage' }]

describe('SwitchProperties - rules UI', () => {
  it('shows rules file reference when data.rules is set', () => {
    render(
      <SwitchProperties
        nodeId="switch-1"
        data={{
          type: 'switch',
          rules: { file: 'routing.rules.yaml', evaluator: 'builtin' },
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('rules-file-label')).toHaveTextContent(
      'Rules: routing.rules.yaml',
    )
  })

  it('shows cases summary when data.cases is set', () => {
    render(
      <SwitchProperties
        nodeId="switch-1"
        data={{
          type: 'switch',
          cases: [
            { when: 'approved', next: 'process' },
            { when: 'rejected', next: 'reject' },
            { when: 'pending', next: 'wait' },
          ],
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('cases-summary')).toHaveTextContent('3 cases')
  })

  it('shows "No routing configured" when neither rules nor cases', () => {
    render(
      <SwitchProperties
        nodeId="switch-1"
        data={{ type: 'switch' }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('no-routing')).toHaveTextContent('No routing configured')
  })
})

describe('SwitchEditor - rules UI', () => {
  it('renders RulesRefEditor and RulesPreview when data.rules is set', () => {
    render(
      <SwitchEditor
        nodeId="switch-1"
        data={{
          type: 'switch',
          rules: { file: 'routing.rules.yaml', evaluator: 'builtin' },
        }}
        lanes={baseLanes}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('rules-ref-editor')).toBeInTheDocument()
    expect(screen.getByTestId('rules-preview')).toBeInTheDocument()
    expect(screen.getByTestId('rules-file-input')).toHaveValue('routing.rules.yaml')
  })

  it('switching modes enforces mutual exclusion', () => {
    const onChange = vi.fn()
    render(
      <SwitchEditor
        nodeId="switch-1"
        data={{
          type: 'switch',
          cases: [{ when: 'x', next: 'y' }],
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
    expect(updatedData.cases).toBeUndefined()
  })

  it('switching from rules mode restores cases and clears rules', () => {
    const onChange = vi.fn()
    render(
      <SwitchEditor
        nodeId="switch-1"
        data={{
          type: 'switch',
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
    expect(updatedData.cases).toEqual([{ when: '', next: '' }])
  })
})
