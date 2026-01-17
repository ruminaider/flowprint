import { useEffect, useState } from 'react'

/**
 * User-specified theme preference.
 *
 * - `'light'` -- always use the light theme
 * - `'dark'` -- always use the dark (Catppuccin Mocha) theme
 * - `'system'` -- follow the OS `prefers-color-scheme` setting
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * The concrete theme applied to the editor after resolving `'system'` mode.
 */
export type ResolvedTheme = 'light' | 'dark'

/**
 * React hook that resolves a {@link ThemeMode} to a concrete {@link ResolvedTheme}.
 *
 * When `mode` is `'system'`, listens to the `prefers-color-scheme` media query and
 * updates automatically when the user's OS theme changes.
 *
 * @param mode - The desired theme mode.
 * @returns The resolved theme (`'light'` or `'dark'`).
 *
 * @example
 * ```ts
 * const resolved = useTheme('system') // 'light' or 'dark' based on OS
 * ```
 */
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
