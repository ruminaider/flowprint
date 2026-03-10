import { useCallback, useRef } from 'react'

export function useTimers() {
  const timers = useRef<number[]>([])

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const t = window.setTimeout(fn, delay)
    timers.current.push(t)
    return t
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])

  return { addTimer, clearTimers, timersRef: timers }
}
