import { cn } from '@/lib/utils'

export function BridgeCTA({
  onClick,
  children,
  className,
}: {
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2.5 mt-4 px-[22px] py-[11px] font-sans text-[13px] font-semibold tracking-[0.02em] text-fg',
        'bg-gradient-to-br from-accent/[0.15] to-accent/[0.05] border border-accent/25 rounded-[10px]',
        'cursor-pointer transition-all duration-300 relative overflow-hidden',
        'hover:border-accent/45 hover:shadow-[0_0_30px_rgba(228,70,255,0.15)]',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-accent/10 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
