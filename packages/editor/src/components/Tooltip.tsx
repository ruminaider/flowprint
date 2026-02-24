import type { ReactNode } from 'react'

export interface TooltipProps {
  text: string
  children: ReactNode
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <div className="fp-tooltip">
      {children}
      <span className="fp-tooltip__text" role="tooltip">
        {text}
      </span>
    </div>
  )
}
