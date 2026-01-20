import { useEffect } from 'react'

export interface UnsavedChangesGuardProps {
  dirty: boolean
}

export function UnsavedChangesGuard({ dirty }: UnsavedChangesGuardProps) {
  useEffect(() => {
    if (!dirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [dirty])

  return null
}
