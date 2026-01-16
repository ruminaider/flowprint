import { useState, useEffect, useCallback, useRef } from 'react'
import type { SymbolSearchProvider, SymbolResult } from '../../symbols/types'
import type { EntryPoint } from '@ruminaider/flowprint-schema'

export interface EntryPointPickerProps {
  /** Current file path value */
  file: string
  /** Current symbol name value */
  symbol: string
  /** Callback when either file or symbol changes */
  onChange: (entry: EntryPoint) => void
  /** Optional symbol search provider */
  symbolSearch?: SymbolSearchProvider
  /** Aria label prefix for accessibility */
  ariaLabelPrefix?: string
}

const KIND_LABELS: Record<SymbolResult['kind'], string> = {
  function: 'fn',
  class: 'class',
  method: 'method',
  variable: 'var',
  type: 'type',
  interface: 'iface',
}

export function EntryPointPicker({
  file,
  symbol,
  onChange,
  symbolSearch,
  ariaLabelPrefix = 'Entry point',
}: EntryPointPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounced search
  useEffect(() => {
    if (!symbolSearch?.ready) return
    if (query.trim() === '') {
      const timer = setTimeout(() => {
        setResults([])
        setIsOpen(false)
      }, 0)
      return () => {
        clearTimeout(timer)
      }
    }

    const timer = setTimeout(() => {
      setIsSearching(true)
      void symbolSearch.search(query).then(
        (res) => {
          setResults(res)
          setIsOpen(true)
          setIsSearching(false)
        },
        () => {
          setResults([])
          setIsSearching(false)
        },
      )
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [query, symbolSearch])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [])

  const handleSelectResult = useCallback(
    (result: SymbolResult) => {
      onChange({ file: result.file, symbol: result.symbol })
      setIsOpen(false)
      setQuery('')
    },
    [onChange],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ file: e.target.value, symbol })
    },
    [onChange, symbol],
  )

  const handleSymbolChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ file, symbol: e.target.value })
    },
    [onChange, file],
  )

  // No provider or provider not ready: plain text inputs
  if (!symbolSearch?.ready) {
    return (
      <div className="fp-entry-picker">
        <input
          type="text"
          className="fp-panel-field-input"
          value={file}
          onChange={handleFileChange}
          placeholder="file"
          aria-label={`${ariaLabelPrefix} file`}
        />
        <input
          type="text"
          className="fp-panel-field-input"
          value={symbol}
          onChange={handleSymbolChange}
          placeholder="symbol"
          aria-label={`${ariaLabelPrefix} symbol`}
        />
        {symbolSearch && !symbolSearch.ready && (
          <span className="fp-entry-picker-provider">loading...</span>
        )}
      </div>
    )
  }

  // Provider is ready: search mode
  return (
    <div className="fp-entry-picker" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <span className="fp-entry-picker-provider">Using {symbolSearch.name}</span>
      <input
        type="text"
        className="fp-entry-picker-search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
        }}
        placeholder="Search symbols..."
        aria-label={`${ariaLabelPrefix} search`}
      />
      {isOpen && (
        <div className="fp-entry-picker-results" role="listbox">
          {results.length === 0 && !isSearching && (
            <div className="fp-entry-picker-no-results">No results</div>
          )}
          {results.map((result, i) => (
            <button
              key={`${result.file}:${result.symbol}:${String(i)}`}
              type="button"
              className="fp-entry-picker-result"
              role="option"
              aria-selected={false}
              onClick={() => {
                handleSelectResult(result)
              }}
            >
              <span className="fp-entry-picker-result-name">{result.symbol}</span>
              <span className="fp-entry-picker-result-kind">
                {KIND_LABELS[result.kind]}
              </span>
              <span className="fp-entry-picker-result-file">{result.file}</span>
              {result.preview && (
                <span className="fp-entry-picker-result-preview">{result.preview}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        className="fp-panel-field-input"
        value={file}
        onChange={handleFileChange}
        placeholder="file"
        aria-label={`${ariaLabelPrefix} file`}
      />
      <input
        type="text"
        className="fp-panel-field-input"
        value={symbol}
        onChange={handleSymbolChange}
        placeholder="symbol"
        aria-label={`${ariaLabelPrefix} symbol`}
      />
    </div>
  )
}
