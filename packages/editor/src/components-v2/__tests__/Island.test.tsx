import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Island } from '../Island'

describe('Island', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders children', () => {
    const { getByText } = render(
      <Island>
        <span>Hello Island</span>
      </Island>,
    )
    expect(getByText('Hello Island')).toBeTruthy()
  })

  it('applies .fp-island class', () => {
    const { container } = render(
      <Island>content</Island>,
    )
    const el = container.firstElementChild
    expect(el?.classList.contains('fp-island')).toBe(true)
  })

  it('merges custom className', () => {
    const { container } = render(
      <Island className="fp-toolbar">content</Island>,
    )
    const el = container.firstElementChild
    expect(el?.classList.contains('fp-island')).toBe(true)
    expect(el?.classList.contains('fp-toolbar')).toBe(true)
  })

  it('passes style prop through', () => {
    const { container } = render(
      <Island style={{ maxWidth: '400px' }}>content</Island>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.maxWidth).toBe('400px')
  })
})
