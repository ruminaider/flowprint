import { useState, useCallback, useRef } from 'react'

export interface TabInfo {
  id: string
  label: string
  type: string
  closable: boolean
}

interface UseTabStateReturn {
  tabs: TabInfo[]
  activeTabId: string
  openTab: (nodeId: string, nodeType: string, label: string) => void
  closeTab: (id: string) => void
  closeAllTabs: () => void
  closeOtherTabs: (id: string) => void
  setActiveTab: (id: string) => void
}

const GRAPH_TAB: TabInfo = {
  id: 'graph',
  label: 'Graph',
  type: 'graph',
  closable: false,
}

export function useTabState(): UseTabStateReturn {
  const [tabs, setTabs] = useState<TabInfo[]>([GRAPH_TAB])
  const [activeTabId, setActiveTabId] = useState('graph')
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs

  const openTab = useCallback((nodeId: string, nodeType: string, label: string) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.id === nodeId)
      if (exists) {
        return prev
      }
      return [...prev, { id: nodeId, label, type: nodeType, closable: true }]
    })
    setActiveTabId(nodeId)
  }, [])

  const closeTab = useCallback((id: string) => {
    if (id === 'graph') {
      return
    }

    const currentTabs = tabsRef.current
    const idx = currentTabs.findIndex((t) => t.id === id)
    if (idx === -1) {
      return
    }

    const filtered = currentTabs.filter((t) => t.id !== id)

    // Compute neighbor before updating state
    let neighborId = 'graph'
    const prevTab = filtered[idx - 1]
    const nextTab = filtered[idx]
    if (idx > 0 && prevTab) {
      neighborId = prevTab.id
    } else if (nextTab) {
      neighborId = nextTab.id
    }

    setTabs(filtered)
    setActiveTabId((prevActive) => {
      if (prevActive !== id) {
        return prevActive
      }
      return neighborId
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setTabs([GRAPH_TAB])
    setActiveTabId('graph')
  }, [])

  const closeOtherTabs = useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.id === id || t.id === 'graph'))
    setActiveTabId(id)
  }, [])

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id)
  }, [])

  return {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTab,
  }
}
