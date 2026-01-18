import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SettingsDialog } from './SettingsDialog'
import type { AppSettings } from '../hooks/useSettings'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

afterEach(() => {
  cleanup()
})

const defaultSettings: AppSettings = {
  repoRoot: '/home/user/project',
  codeSearchUrl: 'http://localhost:8080',
  theme: 'system',
}

describe('SettingsDialog', () => {
  it('renders all form fields with initial values', () => {
    render(
      <SettingsDialog open={true} settings={defaultSettings} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByLabelText<HTMLInputElement>('Repository root').value).toBe(
      '/home/user/project',
    )
    expect(screen.getByLabelText<HTMLInputElement>('Code-search URL').value).toBe(
      'http://localhost:8080',
    )
    expect(screen.getByLabelText<HTMLInputElement>('System').checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('Light').checked).toBe(false)
    expect(screen.getByLabelText<HTMLInputElement>('Dark').checked).toBe(false)
  })

  it('updates settings on save', () => {
    const onSave = vi.fn()

    render(
      <SettingsDialog open={true} settings={defaultSettings} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByLabelText('Repository root'), {
      target: { value: '/new/repo' },
    })
    fireEvent.change(screen.getByLabelText('Code-search URL'), {
      target: { value: 'http://localhost:9090' },
    })

    fireEvent.click(screen.getByText('Save'))

    expect(onSave).toHaveBeenCalledWith({
      repoRoot: '/new/repo',
      codeSearchUrl: 'http://localhost:9090',
      theme: 'system',
    })
  })

  it('calls onClose on cancel', () => {
    const onClose = vi.fn()

    render(
      <SettingsDialog open={true} settings={defaultSettings} onSave={vi.fn()} onClose={onClose} />,
    )

    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('theme radio buttons work correctly', () => {
    const onSave = vi.fn()

    render(
      <SettingsDialog open={true} settings={defaultSettings} onSave={onSave} onClose={vi.fn()} />,
    )

    // Initially system is selected
    expect(screen.getByLabelText<HTMLInputElement>('System').checked).toBe(true)

    // Select Dark
    fireEvent.click(screen.getByLabelText('Dark'))
    expect(screen.getByLabelText<HTMLInputElement>('Dark').checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('System').checked).toBe(false)

    // Save with dark theme
    fireEvent.click(screen.getByText('Save'))
    expect(onSave).toHaveBeenCalledWith({
      repoRoot: '/home/user/project',
      codeSearchUrl: 'http://localhost:8080',
      theme: 'dark',
    })

    // Select Light
    fireEvent.click(screen.getByLabelText('Light'))
    expect(screen.getByLabelText<HTMLInputElement>('Light').checked).toBe(true)
    expect(screen.getByLabelText<HTMLInputElement>('Dark').checked).toBe(false)
  })
})
