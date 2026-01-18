import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import type { AppSettings } from './useSettings'

vi.mock('../lib/idb', () => ({
  STORES: { recentFiles: 'recent-files', settings: 'settings' },
  get: vi.fn(),
  put: vi.fn(),
}))

type IdbModule = typeof import('../lib/idb')

async function getIdb(): Promise<IdbModule> {
  return import('../lib/idb')
}

describe('useSettings', () => {
  let idb: IdbModule

  beforeEach(async () => {
    cleanup()
    vi.clearAllMocks()
    idb = await getIdb()
    vi.mocked(idb.get).mockResolvedValue(undefined)
    vi.mocked(idb.put).mockResolvedValue(undefined)
  })

  it('returns default settings initially with loading true', async () => {
    const { useSettings, DEFAULT_SETTINGS } = await import('./useSettings')
    const { result } = renderHook(() => useSettings())

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.current.loading).toBe(true)
  })

  it('loads persisted settings from IDB', async () => {
    const stored: AppSettings = {
      repoRoot: '/home/user/project',
      codeSearchUrl: 'http://localhost:8080',
      theme: 'dark',
    }
    vi.mocked(idb.get).mockResolvedValue(stored)

    const { useSettings } = await import('./useSettings')
    const { result } = renderHook(() => useSettings())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.settings).toEqual(stored)
    expect(idb.get).toHaveBeenCalledWith('settings', 'app-settings')
  })

  it('updates settings with partial patch', async () => {
    vi.mocked(idb.get).mockResolvedValue(undefined)

    const { useSettings } = await import('./useSettings')
    const { result } = renderHook(() => useSettings())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.updateSettings({ repoRoot: '/new/path' })
    })

    expect(result.current.settings.repoRoot).toBe('/new/path')
    expect(result.current.settings.codeSearchUrl).toBe('')
    expect(result.current.settings.theme).toBe('system')

    expect(idb.put).toHaveBeenCalledWith('settings', 'app-settings', {
      repoRoot: '/new/path',
      codeSearchUrl: '',
      theme: 'system',
    })
  })

  it('merges patches correctly without losing unpatched fields', async () => {
    const initial: AppSettings = {
      repoRoot: '/home/user/project',
      codeSearchUrl: 'http://localhost:8080',
      theme: 'dark',
    }
    vi.mocked(idb.get).mockResolvedValue(initial)

    const { useSettings } = await import('./useSettings')
    const { result } = renderHook(() => useSettings())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.updateSettings({ theme: 'light' })
    })

    expect(result.current.settings).toEqual({
      repoRoot: '/home/user/project',
      codeSearchUrl: 'http://localhost:8080',
      theme: 'light',
    })

    expect(idb.put).toHaveBeenCalledWith('settings', 'app-settings', {
      repoRoot: '/home/user/project',
      codeSearchUrl: 'http://localhost:8080',
      theme: 'light',
    })
  })
})
