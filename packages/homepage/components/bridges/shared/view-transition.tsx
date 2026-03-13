'use client'

import { cn } from '@/lib/utils'
import { useDynamicHeight } from '@/hooks/use-dynamic-height'

export function ViewTransition({
  showDev,
  bizContent,
  devContent,
  className,
  bizClassName,
  devClassName,
}: {
  showDev: boolean
  bizContent: React.ReactNode
  devContent: React.ReactNode
  className?: string
  bizClassName?: string
  devClassName?: string
}) {
  const { containerRef, bizRef, devRef } = useDynamicHeight(showDev)

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden w-full transition-[height] duration-500 ease-out-expo',
        className,
      )}
    >
      <div
        ref={bizRef}
        className={cn(
          'absolute top-0 inset-x-0 transition-all duration-500 ease-out-expo',
          showDev
            ? 'opacity-0 translate-y-3 pointer-events-none'
            : 'opacity-100 translate-y-0',
          bizClassName,
        )}
      >
        {bizContent}
      </div>
      <div
        ref={devRef}
        className={cn(
          'absolute top-0 inset-x-0 transition-all duration-500 ease-out-expo',
          showDev
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-3 pointer-events-none',
          devClassName,
        )}
      >
        {devContent}
      </div>
    </div>
  )
}
