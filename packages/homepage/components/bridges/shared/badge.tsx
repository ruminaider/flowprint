import { cn } from '@/lib/utils'

type BadgeVariant = 'business' | 'developer'
type ColorScheme = 'magenta-teal' | 'purple-magenta'

const COLOR_MAP: Record<ColorScheme, Record<BadgeVariant, string>> = {
  'magenta-teal': {
    business: 'text-accent bg-accent/10 border-accent/20',
    developer: 'text-type-teal bg-type-teal/10 border-type-teal/20',
  },
  'purple-magenta': {
    business: 'text-node-switch bg-node-switch/[0.12] border-node-switch/20',
    developer: 'text-accent bg-accent/[0.12] border-accent/20',
  },
}

export function Badge({
  variant,
  colorScheme = 'magenta-teal',
  pulse = false,
  children,
  className,
}: {
  variant: BadgeVariant
  colorScheme?: ColorScheme
  pulse?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.05em]',
        COLOR_MAP[colorScheme][variant],
        className,
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-current',
          pulse && 'animate-[bridge-badge-pulse-dot_2s_ease-in-out_infinite]',
        )}
      />
      {children}
    </div>
  )
}
