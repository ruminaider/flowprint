import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function useTheme(mode: ThemeMode): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (mode !== 'system') return mode
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (mode !== 'system') {
      setResolved(mode)
      return
    }
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    setResolved(mql.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handler)
    return () => {
      mql.removeEventListener('change', handler)
    }
  }, [mode])

  return resolved
}
