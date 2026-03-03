import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { WelcomeScreen, formatRelativeTime } from './WelcomeScreen'
import type { RecentFile } from '../hooks/useRecentFiles'

afterEach(() => {
  cleanup()
})

const recentFiles: RecentFile[] = [
  { name: 'checkout.flowprint.yaml', path: '/projects/checkout', lastOpened: Date.now() - 3600000 },
  { name: 'auth.flowprint.yaml', path: null, lastOpened: Date.now() - 7200000 },
]

const defaultProps = {
  recentFiles: [] as RecentFile[],
  onOpenFile: vi.fn(),
  onNewBlueprint: vi.fn(),
  onOpenRecent: vi.fn(),
  onLoadTemplate: vi.fn(),
  isDark: true,
}

describe('WelcomeScreen', () => {
  it('renders hero title', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText(/Design workflows/)).toBeTruthy()
  })

  it('shows "New Blueprint" and "Open YAML" action buttons', () => {
    const { container } = render(<WelcomeScreen {...defaultProps} />)
    const buttons = container.querySelectorAll('main button')
    const texts = Array.from(buttons).map((b) => b.textContent)
    expect(texts.some((t) => t?.includes('NEW BLUEPRINT'))).toBe(true)
    expect(texts.some((t) => t?.includes('OPEN YAML'))).toBe(true)
  })

  it('calls onNewBlueprint when clicking "New Blueprint"', () => {
    const onNewBlueprint = vi.fn()
    const { container } = render(
      <WelcomeScreen {...defaultProps} onNewBlueprint={onNewBlueprint} />,
    )
    const btn = Array.from(container.querySelectorAll('main button')).find((b) =>
      b.textContent?.includes('NEW BLUEPRINT'),
    )
    fireEvent.click(btn!)
    expect(onNewBlueprint).toHaveBeenCalledOnce()
  })

  it('calls onOpenFile when clicking "Open YAML"', () => {
    const onOpenFile = vi.fn()
    const { container } = render(<WelcomeScreen {...defaultProps} onOpenFile={onOpenFile} />)
    const btn = Array.from(container.querySelectorAll('main button')).find((b) =>
      b.textContent?.includes('OPEN YAML'),
    )
    fireEvent.click(btn!)
    expect(onOpenFile).toHaveBeenCalledOnce()
  })

  it('renders template cards', () => {
    render(<WelcomeScreen {...defaultProps} />)
    expect(screen.getByText('Hello World')).toBeTruthy()
    expect(screen.getByText('Insurance Claims')).toBeTruthy()
  })

  it('renders 10 template cards', () => {
    const { container } = render(<WelcomeScreen {...defaultProps} />)
    const cards = container.querySelectorAll('[data-testid="template-card"]')
    expect(cards).toHaveLength(10)
  })

  it('calls onLoadTemplate when clicking a template card', () => {
    const onLoadTemplate = vi.fn()
    render(<WelcomeScreen {...defaultProps} onLoadTemplate={onLoadTemplate} />)
    fireEvent.click(screen.getByText('Hello World'))
    expect(onLoadTemplate).toHaveBeenCalledOnce()
    const doc = onLoadTemplate.mock.calls[0]![0]
    expect(doc.schema).toBe('flowprint/1.0')
    expect(doc.nodes).toBeTruthy()
  })

  it('renders recent files when provided', () => {
    render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)
    expect(screen.getByText('checkout.flowprint.yaml')).toBeTruthy()
    expect(screen.getByText('auth.flowprint.yaml')).toBeTruthy()
  })

  it('calls onOpenRecent when clicking a recent file', () => {
    const onOpenRecent = vi.fn()
    render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} onOpenRecent={onOpenRecent} />)
    fireEvent.click(screen.getByText('checkout.flowprint.yaml'))
    expect(onOpenRecent).toHaveBeenCalledOnce()
    expect(onOpenRecent).toHaveBeenCalledWith(recentFiles[0])
  })

  it('hides recent files section when empty', () => {
    const { container } = render(<WelcomeScreen {...defaultProps} recentFiles={[]} />)
    expect(container.querySelector('[data-testid="recent-files-section"]')).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for < 1 minute', () => {
    expect(formatRelativeTime(Date.now() - 30000)).toBe('just now')
  })

  it('returns minutes ago', () => {
    expect(formatRelativeTime(Date.now() - 300000)).toBe('5 minutes ago')
  })

  it('returns hours ago', () => {
    expect(formatRelativeTime(Date.now() - 7200000)).toBe('2 hours ago')
  })

  it('returns days ago', () => {
    expect(formatRelativeTime(Date.now() - 172800000)).toBe('2 days ago')
  })

  it('returns singular forms', () => {
    expect(formatRelativeTime(Date.now() - 60000)).toBe('1 minute ago')
    expect(formatRelativeTime(Date.now() - 3600000)).toBe('1 hour ago')
    expect(formatRelativeTime(Date.now() - 86400000)).toBe('1 day ago')
  })
})
