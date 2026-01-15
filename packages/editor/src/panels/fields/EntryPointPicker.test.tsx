import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { EntryPointPicker } from './EntryPointPicker'
import type { SymbolSearchProvider, SymbolResult } from '../../symbols/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProvider(overrides?: Partial<SymbolSearchProvider>): SymbolSearchProvider {
  return {
    search: vi.fn().mockResolvedValue([]),
    resolve: vi.fn().mockResolvedValue(null),
    name: 'test-provider',
    ready: true,
    ...overrides,
  }
}

const sampleResults: SymbolResult[] = [
  { file: 'src/main.ts', symbol: 'main', kind: 'function', preview: 'function main() {' },
  { file: 'src/app.ts', symbol: 'App', kind: 'class' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntryPointPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders file and symbol inputs when no provider', () => {
    const onChange = vi.fn()
    render(
      <EntryPointPicker file="src/a.ts" symbol="foo" onChange={onChange} />,
    )

    const fileInput = screen.getByLabelText('Entry point file')
    const symbolInput = screen.getByLabelText('Entry point symbol')

    expect(fileInput).toBeTruthy()
    expect(symbolInput).toBeTruthy()
    expect((fileInput as HTMLInputElement).value).toBe('src/a.ts')
    expect((symbolInput as HTMLInputElement).value).toBe('foo')
  })

  it('renders file and symbol inputs when provider not ready', () => {
    const provider = makeProvider({ ready: false })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file="src/b.ts"
        symbol="bar"
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    expect(screen.getByLabelText('Entry point file')).toBeTruthy()
    expect(screen.getByLabelText('Entry point symbol')).toBeTruthy()
    expect(screen.getByText('loading...')).toBeTruthy()
  })

  it('shows provider name when provider is ready', () => {
    const provider = makeProvider({ name: 'tree-sitter' })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    expect(screen.getByText('Using tree-sitter')).toBeTruthy()
  })

  it('typing triggers search after debounce', async () => {
    const searchFn = vi.fn().mockResolvedValue(sampleResults)
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'main' } })

    // Search should NOT have been called yet (before debounce)
    expect(searchFn).not.toHaveBeenCalled()

    // Advance past the 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(searchFn).toHaveBeenCalledWith('main')
  })

  it('displays search results in dropdown', async () => {
    const searchFn = vi.fn().mockResolvedValue(sampleResults)
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'main' } })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('main')).toBeTruthy()
    expect(screen.getByText('fn')).toBeTruthy()
    expect(screen.getByText('src/main.ts')).toBeTruthy()
    expect(screen.getByText('function main() {')).toBeTruthy()
    expect(screen.getByText('App')).toBeTruthy()
    expect(screen.getByText('class')).toBeTruthy()
    expect(screen.getByText('src/app.ts')).toBeTruthy()
  })

  it('clicking a result calls onChange with file and symbol', async () => {
    const searchFn = vi.fn().mockResolvedValue(sampleResults)
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'main' } })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    const resultButtons = screen.getAllByRole('option')
    fireEvent.click(resultButtons[0]!)

    expect(onChange).toHaveBeenCalledWith({ file: 'src/main.ts', symbol: 'main' })
  })

  it('shows "No results" for empty search results', async () => {
    const searchFn = vi.fn().mockResolvedValue([])
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('No results')).toBeTruthy()
  })

  it('closes dropdown on Escape', async () => {
    const searchFn = vi.fn().mockResolvedValue(sampleResults)
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'main' } })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Results should be visible
    expect(screen.getByText('main')).toBeTruthy()

    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    // Dropdown should be closed
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes dropdown on outside click', async () => {
    const searchFn = vi.fn().mockResolvedValue(sampleResults)
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <div>
        <button type="button">Outside</button>
        <EntryPointPicker
          file=""
          symbol=""
          onChange={onChange}
          symbolSearch={provider}
        />
      </div>,
    )

    const searchInput = screen.getByLabelText('Entry point search')
    fireEvent.change(searchInput, { target: { value: 'main' } })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Results should be visible
    expect(screen.getByText('main')).toBeTruthy()

    // Click outside
    fireEvent.mouseDown(screen.getByText('Outside'))

    // Dropdown should be closed
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('debounce: multiple rapid keystrokes only trigger one search', async () => {
    const searchFn = vi.fn().mockResolvedValue([])
    const provider = makeProvider({ search: searchFn })
    const onChange = vi.fn()
    render(
      <EntryPointPicker
        file=""
        symbol=""
        onChange={onChange}
        symbolSearch={provider}
      />,
    )

    const searchInput = screen.getByLabelText('Entry point search')

    // Type rapidly
    fireEvent.change(searchInput, { target: { value: 'm' } })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    fireEvent.change(searchInput, { target: { value: 'ma' } })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    fireEvent.change(searchInput, { target: { value: 'mai' } })
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    fireEvent.change(searchInput, { target: { value: 'main' } })

    // None should have fired yet because debounce resets on each change
    expect(searchFn).not.toHaveBeenCalled()

    // Now wait for full debounce period
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    // Only one search should have been triggered with the final value
    expect(searchFn).toHaveBeenCalledTimes(1)
    expect(searchFn).toHaveBeenCalledWith('main')
  })
})
