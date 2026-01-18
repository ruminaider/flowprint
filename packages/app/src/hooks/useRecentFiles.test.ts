import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { RecentFile } from './useRecentFiles'

vi.mock('../lib/idb', () => ({
  STORES: { recentFiles: 'recent-files', settings: 'settings' },
  getAll: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  clear: vi.fn(),
}))

type IdbModule = typeof import('../lib/idb')

async function getIdb(): Promise<IdbModule> {
  return import('../lib/idb')
}

function makeFile(name: string, lastOpened: number, path: string | null = null): RecentFile {
  return { name, path, lastOpened }
}

describe('useRecentFiles', () => {
  let idb: IdbModule

  beforeEach(async () => {
    vi.clearAllMocks()
    idb = await getIdb()
  })

  it('loads recent files on mount', async () => {
    const files = [makeFile('a.flowprint.yaml', 100), makeFile('b.flowprint.yaml', 200)]
    vi.mocked(idb.getAll).mockResolvedValue(files)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    // Wait for useEffect to resolve
    await act(async () => {
      await Promise.resolve()
    })

    expect(idb.getAll).toHaveBeenCalledWith('recent-files')
    expect(result.current.recentFiles).toHaveLength(2)
    // Most recent first
    expect(result.current.recentFiles[0]?.name).toBe('b.flowprint.yaml')
    expect(result.current.recentFiles[1]?.name).toBe('a.flowprint.yaml')
  })

  it('adds a new recent file', async () => {
    vi.mocked(idb.getAll).mockResolvedValue([])
    vi.mocked(idb.put).mockResolvedValue(undefined)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    await act(async () => {
      await Promise.resolve()
    })

    const newFile = { name: 'new.flowprint.yaml', path: '/tmp/new.flowprint.yaml' }
    const now = Date.now()

    vi.mocked(idb.getAll).mockResolvedValue([
      makeFile('new.flowprint.yaml', now, '/tmp/new.flowprint.yaml'),
    ])

    await act(async () => {
      await result.current.addRecent(newFile)
    })

    expect(idb.put).toHaveBeenCalledWith(
      'recent-files',
      'new.flowprint.yaml',
      expect.objectContaining({
        name: 'new.flowprint.yaml',
        path: '/tmp/new.flowprint.yaml',
      }),
    )
    expect(result.current.recentFiles).toHaveLength(1)
    expect(result.current.recentFiles[0]?.name).toBe('new.flowprint.yaml')
  })

  it('updates lastOpened for existing file', async () => {
    const oldTime = 1000
    vi.mocked(idb.getAll).mockResolvedValue([makeFile('existing.flowprint.yaml', oldTime)])
    vi.mocked(idb.put).mockResolvedValue(undefined)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    await act(async () => {
      await Promise.resolve()
    })

    const updatedTime = Date.now()
    vi.mocked(idb.getAll).mockResolvedValue([makeFile('existing.flowprint.yaml', updatedTime)])

    await act(async () => {
      await result.current.addRecent({ name: 'existing.flowprint.yaml', path: null })
    })

    expect(idb.put).toHaveBeenCalledWith(
      'recent-files',
      'existing.flowprint.yaml',
      expect.objectContaining({
        name: 'existing.flowprint.yaml',
        lastOpened: expect.any(Number) as number,
      }),
    )

    // The put call's lastOpened should be newer than the old time
    const putCall = vi.mocked(idb.put).mock.calls[0]
    const savedFile = putCall?.[2] as RecentFile | undefined
    expect(savedFile?.lastOpened).toBeGreaterThan(oldTime)
  })

  it('enforces max 10 limit with LRU eviction', async () => {
    vi.mocked(idb.getAll).mockResolvedValue([])
    vi.mocked(idb.put).mockResolvedValue(undefined)
    vi.mocked(idb.del).mockResolvedValue(undefined)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    await act(async () => {
      await Promise.resolve()
    })

    // Simulate 11 files after adding (the 11th triggers eviction)
    const elevenFiles = Array.from({ length: 11 }, (_, i) =>
      makeFile(`file-${String(i)}.flowprint.yaml`, (i + 1) * 100),
    )

    vi.mocked(idb.getAll).mockResolvedValue(elevenFiles)

    await act(async () => {
      await result.current.addRecent({ name: 'file-10.flowprint.yaml', path: null })
    })

    // The oldest file (file-0, lastOpened=100) should be evicted
    expect(idb.del).toHaveBeenCalledWith('recent-files', 'file-0.flowprint.yaml')
    expect(result.current.recentFiles).toHaveLength(10)
  })

  it('removes a recent file', async () => {
    const files = [makeFile('a.flowprint.yaml', 100), makeFile('b.flowprint.yaml', 200)]
    vi.mocked(idb.getAll).mockResolvedValue(files)
    vi.mocked(idb.del).mockResolvedValue(undefined)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    await act(async () => {
      await Promise.resolve()
    })

    vi.mocked(idb.getAll).mockResolvedValue([makeFile('b.flowprint.yaml', 200)])

    await act(async () => {
      await result.current.removeRecent('a.flowprint.yaml')
    })

    expect(idb.del).toHaveBeenCalledWith('recent-files', 'a.flowprint.yaml')
    expect(result.current.recentFiles).toHaveLength(1)
    expect(result.current.recentFiles[0]?.name).toBe('b.flowprint.yaml')
  })

  it('clears all recent files', async () => {
    const files = [makeFile('a.flowprint.yaml', 100), makeFile('b.flowprint.yaml', 200)]
    vi.mocked(idb.getAll).mockResolvedValue(files)
    vi.mocked(idb.clear).mockResolvedValue(undefined)

    const { useRecentFiles } = await import('./useRecentFiles')
    const { result } = renderHook(() => useRecentFiles())

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await result.current.clearRecent()
    })

    expect(idb.clear).toHaveBeenCalledWith('recent-files')
    expect(result.current.recentFiles).toHaveLength(0)
  })
})
