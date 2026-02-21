import { Tab } from './Tab'

export interface TabBarProps {
  tabs: { id: string; label: string; type: string; closable: boolean }[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onTabCloseAll: () => void
  onTabCloseOthers: (id: string) => void
}

const MAX_VISIBLE_TABS = 8

export function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}: TabBarProps) {
  const visibleTabs = tabs.slice(0, MAX_VISIBLE_TABS)
  const overflowTabs = tabs.slice(MAX_VISIBLE_TABS)

  return (
    <div className="fp-tab-bar">
      {visibleTabs.map((tab) => (
        <Tab
          key={tab.id}
          id={tab.id}
          label={tab.label}
          type={tab.type}
          active={tab.id === activeTabId}
          closable={tab.closable}
          onSelect={onTabSelect}
          onClose={onTabClose}
        />
      ))}
      {overflowTabs.length > 0 && (
        <button type="button" className="fp-tab-bar__overflow" aria-label="More tabs">
          &hellip;
        </button>
      )}
    </div>
  )
}
