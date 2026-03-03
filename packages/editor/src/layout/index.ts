export { computeLayout, computeEdges, computeLaneBands, autoLayout } from './layout-engine'
export type { LaneBand, LayoutResult } from './types'
export {
  LANE_LABEL_WIDTH,
  NODE_WIDTH,
  NODE_HEIGHT,
  LANE_COLOR_COUNT,
  LANE_COLORS,
  DARK_LANE_COLORS,
  getLaneColor,
  getLaneBorderColor,
} from './constants'
