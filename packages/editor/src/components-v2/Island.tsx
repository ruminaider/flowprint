import type { ReactNode } from 'react'

export interface IslandProps {
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

export function Island({ className, style, children }: IslandProps) {
  const classes = className ? `fp-island ${className}` : 'fp-island'
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
