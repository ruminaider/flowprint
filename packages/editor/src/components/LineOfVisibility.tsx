import { memo } from 'react'
import { useViewport } from '@xyflow/react'

interface LineOfVisibilityProps {
  y: number
  totalWidth: number
}

function LineOfVisibility({ y, totalWidth }: LineOfVisibilityProps) {
  const viewport = useViewport()

  return (
    <div
      className="fp-line-of-visibility"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${String(viewport.x)}px, ${String(viewport.y)}px) scale(${String(viewport.zoom)})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
        width: totalWidth,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          width: '100%',
          height: 0,
          borderTop: '3px dashed var(--fp-lov-color)',
          opacity: 0.6,
        }}
      />
      <div
        className="fp-lov-label"
        style={{
          position: 'absolute',
          top: y - 12,
          left: 8,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--fp-lov-color)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          userSelect: 'none',
        }}
      >
        Line of Visibility
      </div>
    </div>
  )
}

export default memo(LineOfVisibility)
