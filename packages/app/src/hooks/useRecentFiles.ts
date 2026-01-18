import { useState, useEffect, useCallback } from 'react'
import { STORES, getAll, put, del, clear } from '../lib/idb'

const MAX_RECENT = 10

export interface RecentFile {
  name: string
  path: string | null
  lastOpened: number
}

export interface UseRecentFilesReturn {
  recentFiles: RecentFile[]
  addRecent: (file: Omit<RecentFile, 'lastOpened'>) => Promise<void>
  removeRecent: (name: string) => Promise<void>
  clearRecent: () => Promise<void>
}

function sortByRecent(files: RecentFile[]): RecentFile[] {
  return [...files].sort((a, b) => b.lastOpened - a.lastOpened)
}

export function useRecentFiles(): UseRecentFilesReturn {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])

  useEffect(() => {
    void getAll<RecentFile>(STORES.recentFiles).then((files) => {
      setRecentFiles(sortByRecent(files))
    })
  }, [])

  const addRecent = useCallback(async (file: Omit<RecentFile, 'lastOpened'>) => {
    const entry: RecentFile = { ...file, lastOpened: Date.now() }

    await put(STORES.recentFiles, entry.name, entry)

    const all = await getAll<RecentFile>(STORES.recentFiles)
    const sorted = sortByRecent(all)

    // Evict oldest entries beyond MAX_RECENT
    if (sorted.length > MAX_RECENT) {
      const toRemove = sorted.slice(MAX_RECENT)
      for (const old of toRemove) {
        await del(STORES.recentFiles, old.name)
      }
    }

    const kept = sorted.slice(0, MAX_RECENT)
    setRecentFiles(kept)
  }, [])

  const removeRecent = useCallback(async (name: string) => {
    await del(STORES.recentFiles, name)
    const all = await getAll<RecentFile>(STORES.recentFiles)
    setRecentFiles(sortByRecent(all))
  }, [])

  const clearRecent = useCallback(async () => {
    await clear(STORES.recentFiles)
    setRecentFiles([])
  }, [])

  return { recentFiles, addRecent, removeRecent, clearRecent }
}
