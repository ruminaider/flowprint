'use client'

import * as Tabs from '@radix-ui/react-tabs'
import { OverviewSection } from './overview-section'
import { CapabilitiesSection } from './capabilities-section'
import { TryItSection } from './tryit-section'

export function HomepageTabs() {
  return (
    <Tabs.Root defaultValue="overview" className="homepage-tabs">
      <Tabs.List className="tab-list">
        <Tabs.Trigger value="overview" className="tab-trigger">
          Overview
        </Tabs.Trigger>
        <Tabs.Trigger value="capabilities" className="tab-trigger">
          Capabilities
        </Tabs.Trigger>
        <Tabs.Trigger value="tryit" className="tab-trigger">
          Try It
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview" className="tab-content">
        <OverviewSection />
      </Tabs.Content>

      <Tabs.Content value="capabilities" className="tab-content">
        <CapabilitiesSection />
      </Tabs.Content>

      <Tabs.Content value="tryit" className="tab-content">
        <TryItSection />
      </Tabs.Content>
    </Tabs.Root>
  )
}
