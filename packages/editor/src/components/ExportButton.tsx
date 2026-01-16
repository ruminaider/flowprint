import { useCallback } from 'react'
import { useReactFlow, getNodesBounds } from '@xyflow/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export interface ExportButtonProps {
  doc: FlowprintDocument
}

export function ExportButton({ doc }: ExportButtonProps) {
  const { getNodes } = useReactFlow()

  const handleExport = useCallback(() => {
    const nodes = getNodes()
    if (nodes.length === 0) return

    // Get the React Flow viewport element
    const viewport = document.querySelector('.react-flow__viewport')
    if (!viewport) return

    // Clone the viewport SVG content
    const bounds = getNodesBounds(nodes)
    const padding = 50
    const width = bounds.width + padding * 2
    const height = bounds.height + padding * 2

    // Create SVG with the viewport content
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('xmlns', svgNS)
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute(
      'viewBox',
      `${String(bounds.x - padding)} ${String(bounds.y - padding)} ${String(width)} ${String(height)}`,
    )

    // Clone viewport content into SVG
    const clone = viewport.cloneNode(true) as SVGElement
    svg.appendChild(clone)

    // Serialize and download
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.name}.svg`
    a.click()

    URL.revokeObjectURL(url)
  }, [doc.name, getNodes])

  return (
    <button
      type="button"
      className="fp-export-btn"
      onClick={handleExport}
      aria-label="Export as SVG"
    >
      Export SVG
    </button>
  )
}
