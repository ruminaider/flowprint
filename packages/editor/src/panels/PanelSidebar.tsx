import { useCallback } from 'react'

/**
 * Identifies which sidebar tab is active.
 */
export type SidebarTab = 'properties' | 'lanes' | 'yaml'

/**
 * Props for {@link PanelSidebar}.
 */
export interface PanelSidebarProps {
  /** Currently active tab, or `null` when the sidebar is collapsed. */
  activeTab: SidebarTab | null
  /** Callback when a tab is clicked. Receives the new tab or `null` to collapse. */
  onTabChange: (tab: SidebarTab | null) => void
  /** Whether to show the YAML tab. Controlled by the editor's `showYamlPreview` prop. */
  showYamlTab: boolean
  /** Panel content keyed by tab name. */
  children: {
    properties: React.ReactNode
    lanes: React.ReactNode
    yaml: React.ReactNode | null
  }
}

const TAB_CONFIG: { id: SidebarTab; icon: string; title: string }[] = [
  { id: 'properties', icon: '\u2699', title: 'Properties' },
  { id: 'lanes', icon: '\u2261', title: 'Lanes' },
  { id: 'yaml', icon: '<>', title: 'YAML Preview' },
]

/**
 * Right-hand sidebar with a vertical tab strip and a content area.
 *
 * Clicking an inactive tab opens it; clicking the active tab collapses the
 * sidebar. The component is fully controlled via `activeTab` / `onTabChange`.
 */
export function PanelSidebar({ activeTab, onTabChange, showYamlTab, children }: PanelSidebarProps) {
  const handleTabClick = useCallback(
    (tab: SidebarTab) => {
      onTabChange(activeTab === tab ? null : tab)
    },
    [activeTab, onTabChange],
  )

  const collapsed = activeTab === null

  return (
    <div className={`fp-sidebar${collapsed ? ' fp-sidebar--collapsed' : ''}`}>
      <div className="fp-sidebar-tabs" role="tablist" aria-label="Editor panels">
        {TAB_CONFIG.map(({ id, icon, title }) => {
          if (id === 'yaml' && !showYamlTab) return null
          return (
            <button
              key={id}
              type="button"
              role="tab"
              className="fp-sidebar-tab"
              aria-selected={activeTab === id}
              title={title}
              onClick={() => {
                handleTabClick(id)
              }}
            >
              {icon}
            </button>
          )
        })}
      </div>
      <div className="fp-sidebar-content" role="tabpanel">
        {activeTab === 'properties' && children.properties}
        {activeTab === 'lanes' && children.lanes}
        {activeTab === 'yaml' && children.yaml}
      </div>
    </div>
  )
}
