import { useState, useCallback } from 'react'

export interface UseLaneCollapseReturn {
  isCollapsed: (laneId: string) => boolean
  toggleCollapse: (laneId: string) => void
  collapseAll: (laneIds: string[]) => void
  expandAll: () => void
  collapsedIds: Set<string>
}

export function useLaneCollapse(): UseLaneCollapseReturn {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const isCollapsed = useCallback(
    (laneId: string) => collapsedIds.has(laneId),
    [collapsedIds],
  )

  const toggleCollapse = useCallback((laneId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(laneId)) {
        next.delete(laneId)
      } else {
        next.add(laneId)
      }
      return next
    })
  }, [])

  const collapseAll = useCallback((laneIds: string[]) => {
    setCollapsedIds(new Set(laneIds))
  }, [])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  return {
    isCollapsed,
    toggleCollapse,
    collapseAll,
    expandAll,
    collapsedIds,
  }
}
