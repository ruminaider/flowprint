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

describe('WelcomeScreen', () => {
  it('renders title and subtitle', () => {
    render(
      <WelcomeScreen
        recentFiles={[]}
        onOpenFile={vi.fn()}
        onNewBlueprint={vi.fn()}
        onOpenRecent={vi.fn()}
      />,
    )

    expect(screen.getByText('Flowprint')).toBeTruthy()
    expect(screen.getByText('Visual service blueprint editor')).toBeTruthy()
  })

  it('shows "Open File" and "New Blueprint" buttons', () => {
    render(
      <WelcomeScreen
        recentFiles={[]}
        onOpenFile={vi.fn()}
        onNewBlueprint={vi.fn()}
        onOpenRecent={vi.fn()}
      />,
    )

    expect(screen.getByText('Open File')).toBeTruthy()
    expect(screen.getByText('New Blueprint')).toBeTruthy()
  })

  it('calls onOpenFile when clicking "Open File"', () => {
    const onOpenFile = vi.fn()
    render(
      <WelcomeScreen
        recentFiles={[]}
        onOpenFile={onOpenFile}
        onNewBlueprint={vi.fn()}
        onOpenRecent={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('Open File'))
    expect(onOpenFile).toHaveBeenCalledOnce()
  })

  it('calls onNewBlueprint when clicking "New Blueprint"', () => {
    const onNewBlueprint = vi.fn()
    render(
      <WelcomeScreen
        recentFiles={[]}
        onOpenFile={vi.fn()}
        onNewBlueprint={onNewBlueprint}
        onOpenRecent={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByText('New Blueprint'))
    expect(onNewBlueprint).toHaveBeenCalledOnce()
  })

  it('renders recent files list with file names', () => {
    render(
      <WelcomeScreen
        recentFiles={recentFiles}
        onOpenFile={vi.fn()}
        onNewBlueprint={vi.fn()}
        onOpenRecent={vi.fn()}
      />,
    )

    expect(screen.getByText('checkout.flowprint.yaml')).toBeTruthy()
    expect(screen.getByText('auth.flowprint.yaml')).toBeTruthy()
  })

  it('calls onOpenRecent with correct file when clicking a recent file', () => {
    const onOpenRecent = vi.fn()
    render(
      <WelcomeScreen
        recentFiles={recentFiles}
        onOpenFile={vi.fn()}
        onNewBlueprint={vi.fn()}
        onOpenRecent={onOpenRecent}
      />,
    )

    fireEvent.click(screen.getByText('checkout.flowprint.yaml'))
    expect(onOpenRecent).toHaveBeenCalledOnce()
    expect(onOpenRecent).toHaveBeenCalledWith(recentFiles[0])
  })

  it('shows "No recent files" when list is empty', () => {
    render(
      <WelcomeScreen
        recentFiles={[]}
        onOpenFile={vi.fn()}
        onNewBlueprint={vi.fn()}
        onOpenRecent={vi.fn()}
      />,
    )

    expect(screen.getByText('No recent files')).toBeTruthy()
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
