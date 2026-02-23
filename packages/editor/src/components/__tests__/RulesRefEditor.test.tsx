import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { RulesRefEditor } from '../RulesRefEditor'

afterEach(() => {
  cleanup()
})

describe('RulesRefEditor', () => {
  it('renders file path input when in rules mode', () => {
    const onChange = vi.fn()
    render(
      <RulesRefEditor
        rulesRef={{ file: 'order-rules.rules.yaml', evaluator: 'builtin' }}
        onChange={onChange}
        hasRules={true}
        hasCasesOrEntryPoints={false}
      />,
    )

    const input = screen.getByTestId('rules-file-input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('order-rules.rules.yaml')
  })

  it('calls onChange with updated file path', () => {
    const onChange = vi.fn()
    render(
      <RulesRefEditor
        rulesRef={{ file: 'old.rules.yaml', evaluator: 'builtin' }}
        onChange={onChange}
        hasRules={true}
        hasCasesOrEntryPoints={false}
      />,
    )

    const input = screen.getByTestId('rules-file-input')
    fireEvent.change(input, { target: { value: 'new-path.rules.yaml' } })

    expect(onChange).toHaveBeenCalledWith({
      file: 'new-path.rules.yaml',
      evaluator: 'builtin',
    })
  })

  it('shows evaluator selector in rules mode', () => {
    const onChange = vi.fn()
    render(
      <RulesRefEditor
        rulesRef={{ file: 'test.rules.yaml', evaluator: 'builtin' }}
        onChange={onChange}
        hasRules={true}
        hasCasesOrEntryPoints={false}
      />,
    )

    const select = screen.getByTestId('rules-evaluator-select')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('builtin')
  })

  it('toggles from alternate mode to rules mode', () => {
    const onChange = vi.fn()
    render(
      <RulesRefEditor
        rulesRef={undefined}
        onChange={onChange}
        hasRules={false}
        hasCasesOrEntryPoints={true}
        alternateLabel="Entry Points"
      />,
    )

    // File input should not be visible in alternate mode
    expect(screen.queryByTestId('rules-file-input')).not.toBeInTheDocument()

    // Click the Rules toggle
    const rulesToggle = screen.getByTestId('toggle-rules')
    fireEvent.click(rulesToggle)

    // Should call onChange with a new rules ref
    expect(onChange).toHaveBeenCalledWith({ file: '', evaluator: 'builtin' })
  })

  it('toggles from rules mode to alternate mode (mutual exclusion)', () => {
    const onChange = vi.fn()
    render(
      <RulesRefEditor
        rulesRef={{ file: 'test.rules.yaml', evaluator: 'builtin' }}
        onChange={onChange}
        hasRules={true}
        hasCasesOrEntryPoints={false}
        alternateLabel="Cases"
      />,
    )

    // Click the Cases toggle
    const alternateToggle = screen.getByTestId('toggle-alternate')
    fireEvent.click(alternateToggle)

    // Should call onChange with undefined to clear rules
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
