import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function useTheme(mode: ThemeMode): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (mode !== 'system') return mode
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // For non-system modes, derive directly (no effect needed)
  const effectiveResolved = mode !== 'system' ? mode : resolved

  useEffect(() => {
    if (mode !== 'system') return
    if (typeof window === 'undefined') return

    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    const handler = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handler)

    // Dispatch a synthetic event to sync initial state without calling setState directly
    handler({ matches: mql.matches } as MediaQueryListEvent)

    return () => {
      mql.removeEventListener('change', handler)
    }
  }, [mode])

  return effectiveResolved
}
