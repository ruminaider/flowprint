'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { BridgeDecision } from '@/components/bridges/bridge-decision'
import { BridgeSimulation } from '@/components/bridges/bridge-simulation'
import { BridgeVersioning } from '@/components/bridges/bridge-versioning'

type Perspective = 'business' | 'developer'

export function CapabilitiesSection() {
  const [perspective, setPerspective] = useState<Perspective>('business')

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6">
      {/* Pinned pill toggle — sticky below fixed header */}
      <div className="sticky top-[80px] z-10 mx-auto mb-10 flex w-fit gap-1 rounded-xl border border-surface-border bg-[rgba(26,15,10,0.6)] p-1 backdrop-blur-[12px]">
        <button
          className={cn(
            'cursor-pointer rounded-lg border-none bg-transparent px-5 py-2 sm:px-7 sm:py-2.5 font-sans text-[13px] sm:text-sm font-medium text-fg-muted transition-all duration-200',
            perspective === 'business'
              ? 'bg-accent/[0.12] text-fg shadow-[0_0_12px_rgba(228,70,255,0.15)]'
              : 'hover:text-fg-secondary',
          )}
          onClick={() => setPerspective('business')}
        >
          Business
        </button>
        <button
          className={cn(
            'cursor-pointer rounded-lg border-none bg-transparent px-5 py-2 sm:px-7 sm:py-2.5 font-sans text-[13px] sm:text-sm font-medium text-fg-muted transition-all duration-200',
            perspective === 'developer'
              ? 'bg-accent/[0.12] text-fg shadow-[0_0_12px_rgba(228,70,255,0.15)]'
              : 'hover:text-fg-secondary',
          )}
          onClick={() => setPerspective('developer')}
        >
          Developer
        </button>
      </div>

      {/* Bridge cards stacked vertically */}
      <div className="flex flex-col gap-12">
        <section className="flex justify-center overflow-visible">
          <BridgeDecision perspective={perspective} />
        </section>

        <section className="flex justify-center overflow-visible">
          <BridgeSimulation perspective={perspective} />
        </section>

        <section className="flex justify-center overflow-visible">
          <BridgeVersioning perspective={perspective} />
        </section>
      </div>
    </div>
  )
}
