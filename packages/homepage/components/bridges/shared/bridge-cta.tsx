import { cn } from '@/lib/utils'

export function BridgeCTA({
  onClick,
  children,
  className,
}: {
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button className={cn('bridge-cta', className)} onClick={onClick}>
      {children}
    </button>
  )
}
