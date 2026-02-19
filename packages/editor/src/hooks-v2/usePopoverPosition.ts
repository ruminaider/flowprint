export interface PopoverPositionOptions {
  nodePosition: { x: number; y: number } | null
  nodeWidth: number
  nodeHeight: number
  popoverWidth: number
  viewportWidth: number
  viewportHeight: number
  gap?: number
}

export interface PopoverPosition {
  top: number
  left: number
}

const DEFAULT_GAP = 8

export function computePopoverPosition(
  options: PopoverPositionOptions,
): PopoverPosition | null {
  const {
    nodePosition,
    nodeWidth,
    nodeHeight,
    popoverWidth,
    viewportWidth,
    viewportHeight,
    gap = DEFAULT_GAP,
  } = options

  if (!nodePosition) {
    return null
  }

  // Prefer right of node
  let left = nodePosition.x + nodeWidth + gap

  // If right-positioned popover would overflow viewport, flip to left
  if (left + popoverWidth > viewportWidth) {
    left = nodePosition.x - popoverWidth - gap
  }

  // Vertical: center on node, then clamp to viewport bounds
  const nodeCenterY = nodePosition.y + nodeHeight / 2
  let top = nodeCenterY - popoverWidth / 2 // approximate popover height with width for centering

  // Clamp to viewport
  top = Math.max(0, Math.min(top, viewportHeight - popoverWidth))

  return { top, left }
}
