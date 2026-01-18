import { useState, useEffect, useCallback } from 'react'
import type { ThemeMode } from '@ruminaider/flowprint-editor'
import { STORES, get, put } from '../lib/idb'

export interface AppSettings {
  repoRoot: string
  codeSearchUrl: string
  theme: ThemeMode
}

export const DEFAULT_SETTINGS: AppSettings = {
  repoRoot: '',
  codeSearchUrl: '',
  theme: 'system',
}

export interface UseSettingsReturn {
  settings: AppSettings
  updateSettings(patch: Partial<AppSettings>): Promise<void>
  loading: boolean
}

const SETTINGS_KEY = 'app-settings'

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void get<AppSettings>(STORES.settings, SETTINGS_KEY).then((stored) => {
      if (cancelled) return
      if (stored) {
        setSettings(stored)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>): Promise<void> => {
      let merged: AppSettings | undefined
      setSettings((prev) => {
        merged = { ...prev, ...patch }
        return merged
      })
      return put(STORES.settings, SETTINGS_KEY, merged ?? { ...settings, ...patch })
    },
    [settings],
  )

  return { settings, updateSettings, loading }
}
