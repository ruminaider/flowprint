import { useEffect, useId, useRef } from 'react'
import { useEdgeHighlight, useSimulationAnimation } from '../contexts/SimulationContext'

interface EdgeSimulationOverlayProps {
  edgeId: string
  edgePath: string
}

export function EdgeSimulationOverlay({ edgeId, edgePath }: EdgeSimulationOverlayProps) {
  const highlight = useEdgeHighlight(edgeId)
  const animation = useSimulationAnimation()
  const uniqueId = useId()
  const pathId = `fp-sim-path-${uniqueId}`
  const filterId = `fp-sim-glow-${uniqueId}`
  const groupRef = useRef<SVGGElement>(null)
  const rafRef = useRef<number>(0)

  // Cancel pending rAF only on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Trigger SMIL animations whenever this edge becomes 'traversing' on a new step.
  // Deps include highlight + stepKey so the effect re-fires when:
  //  - the edge transitions to 'traversing' (highlight changes)
  //  - a new step arrives while still 'traversing' (stepKey changes)
  useEffect(() => {
    if (highlight !== 'traversing' || !animation.isForwardStep) return
    const g = groupRef.current
    if (!g) return

    rafRef.current = requestAnimationFrame(() => {
      const smilElements = g.querySelectorAll('animate, animateMotion')
      smilElements.forEach((el) => {
        try {
          ;(el as SVGAnimationElement).beginElement()
        } catch {
          // Ignore if element was removed before this frame
        }
      })
    })
  }, [highlight, animation.isForwardStep, animation.stepKey])

  if (!highlight) return null

  if (highlight === 'traversed') {
    return null
  }

  // highlight === 'traversing'
  // Only show the animation on forward steps.
  // Backward nav / initial render before first step: nothing to show.
  if (!animation.isForwardStep) return null

  const durSeconds = (animation.particleDurationMs / 1000).toFixed(2)
  const dur = `${durSeconds}s`

  // key includes stepKey so React remounts this <g> on every step change,
  // guaranteeing SMIL animations restart cleanly (both manual and autoplay).
  return (
    <g
      ref={groupRef}
      key={`${edgeId}-${String(animation.stepKey)}`}
      style={{
        animation: `fp-sim-edge-fadeout 0.4s ease-out ${durSeconds}s forwards`,
      }}
    >
      {/* SVG filter for energy bead glow */}
      <defs>
        <filter id={filterId} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Hidden reference path for animateMotion */}
      <path id={pathId} d={edgePath} fill="none" stroke="none" />

      {/* Dim base path — shows the route before signal arrives */}
      <path
        d={edgePath}
        stroke="#a6e3a1"
        strokeWidth={2}
        strokeOpacity={0.15}
        fill="none"
        pointerEvents="none"
      />

      {/* Progressive trail — draws itself behind the particle */}
      <path
        d={edgePath}
        pathLength={1}
        stroke="#a6e3a1"
        strokeWidth={3}
        strokeDasharray="1"
        strokeDashoffset="1"
        fill="none"
        pointerEvents="none"
        style={{ filter: 'drop-shadow(0 0 4px rgba(166, 227, 161, 0.6))' }}
        key={`trail-${edgeId}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="1"
          to="0"
          dur={dur}
          fill="freeze"
          begin="indefinite"
        />
      </path>

      {/* Energy bead — multi-layered particle */}
      <g filter={`url(#${filterId})`} key={`bead-${edgeId}`}>
        {/* Outer halo */}
        <circle r={10} fill="rgba(166, 227, 161, 0.15)">
          <animateMotion dur={dur} fill="freeze" begin="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
        {/* Mid glow */}
        <circle r={6} fill="rgba(166, 227, 161, 0.35)">
          <animateMotion dur={dur} fill="freeze" begin="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
        {/* Core */}
        <circle r={4} fill="#a6e3a1">
          <animateMotion dur={dur} fill="freeze" begin="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
        {/* Hot center */}
        <circle r={1.5} fill="#fff">
          <animateMotion dur={dur} fill="freeze" begin="indefinite">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      </g>
    </g>
  )
}
