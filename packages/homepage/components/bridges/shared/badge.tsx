import { cn } from '@/lib/utils'

type BadgeVariant = 'business' | 'developer'
type ColorScheme = 'magenta-teal' | 'purple-magenta'

const COLOR_MAP: Record<ColorScheme, Record<BadgeVariant, string>> = {
  'magenta-teal': {
    business: 'bridge-badge--magenta',
    developer: 'bridge-badge--teal',
  },
  'purple-magenta': {
    business: 'bridge-badge--purple',
    developer: 'bridge-badge--magenta',
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
        'bridge-badge',
        COLOR_MAP[colorScheme][variant],
        pulse && 'bridge-badge--pulse',
        className,
      )}
    >
      <span className="dot" />
      {children}
    </div>
  )
}
