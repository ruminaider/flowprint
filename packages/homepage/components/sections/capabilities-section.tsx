'use client'

import { useState } from 'react'
import { BridgeDecision } from '@/components/bridges/bridge-decision'
import { BridgeSimulation } from '@/components/bridges/bridge-simulation'
import { BridgeVersioning } from '@/components/bridges/bridge-versioning'
import './capabilities-section.css'

type Perspective = 'business' | 'developer'

export function CapabilitiesSection() {
  const [perspective, setPerspective] = useState<Perspective>('business')

  return (
    <div className="capabilities">
      {/* Pinned pill toggle — sticky below fixed header */}
      <div className="perspective-toggle">
        <button
          className={perspective === 'business' ? 'active' : ''}
          onClick={() => setPerspective('business')}
        >
          Business
        </button>
        <button
          className={perspective === 'developer' ? 'active' : ''}
          onClick={() => setPerspective('developer')}
        >
          Developer
        </button>
      </div>

      {/* Bridge cards stacked vertically */}
      <div className="bridge-stack">
        {/* Bridge 1: Decision Tables */}
        <section className="bridge-card-wrapper">
          <BridgeDecision perspective={perspective} />
        </section>

        {/* Bridge 2: Simulation */}
        <section className="bridge-card-wrapper">
          <BridgeSimulation perspective={perspective} />
        </section>

        {/* Bridge 3: Version Control */}
        <section className="bridge-card-wrapper">
          <BridgeVersioning perspective={perspective} />
        </section>
      </div>
    </div>
  )
}
