import { useEffect, useRef } from 'react'

export function useDynamicHeight(isDev: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bizRef = useRef<HTMLDivElement>(null)
  const devRef = useRef<HTMLDivElement>(null)
  const initialRender = useRef(true)

  useEffect(() => {
    const activeView = isDev ? devRef.current : bizRef.current
    if (!activeView || !containerRef.current) return
    const h = activeView.scrollHeight
    if (initialRender.current) {
      containerRef.current.style.transition = 'none'
      containerRef.current.style.height = `${h}px`
      requestAnimationFrame(() => {
        if (containerRef.current) containerRef.current.style.transition = ''
      })
      initialRender.current = false
    } else {
      containerRef.current.style.height = `${h}px`
    }
  }, [isDev])

  return { containerRef, bizRef, devRef }
}
