export const LANE_LABEL_WIDTH = 160
export const NODE_WIDTH = 200
export const NODE_HEIGHT = 80
export const NODE_HORIZONTAL_GAP = 100
export const NODE_VERTICAL_GAP = 40
export const LANE_PADDING_TOP = 50
export const LANE_PADDING_BOTTOM = 20
export const LANE_PADDING_LEFT = 20
export const MIN_LANE_HEIGHT = 140

export const LANE_COLOR_COUNT = 12

export const LANE_COLORS: Record<string, string> = {
  0: '#e0f2fe', // sky-100
  1: '#dbeafe', // blue-100
  2: '#f3e8ff', // purple-100
  3: '#fce7f3', // pink-100
  4: '#ccfbf1', // teal-100
  5: '#fef9c3', // yellow-100
  6: '#fee2e2', // red-100
  7: '#ffedd5', // orange-100
  8: '#d1fae5', // emerald-100
  9: '#e0e7ff', // indigo-100
  10: '#fae8ff', // fuchsia-100
  11: '#f0fdf4', // green-100
}

export const LANE_BORDER_COLORS: Record<string, string> = {
  0: '#38bdf8', // sky-400
  1: '#60a5fa', // blue-400
  2: '#c084fc', // purple-400
  3: '#f472b6', // pink-400
  4: '#2dd4bf', // teal-400
  5: '#facc15', // yellow-400
  6: '#f87171', // red-400
  7: '#fb923c', // orange-400
  8: '#34d399', // emerald-400
  9: '#818cf8', // indigo-400
  10: '#e879f9', // fuchsia-400
  11: '#4ade80', // green-400
}

export function getLaneColor(index: number): string {
  return LANE_COLORS[index % LANE_COLOR_COUNT] ?? '#f1f5f9'
}

export const DARK_LANE_COLORS: Record<string, string> = {
  0: '#1e2e3e', // dark sky tint
  1: '#1e2638', // dark blue tint
  2: '#2a1e38', // dark purple tint
  3: '#381e2e', // dark pink tint
  4: '#1e3832', // dark teal tint
  5: '#38341e', // dark yellow tint
  6: '#382020', // dark red tint
  7: '#382a1e', // dark orange tint
  8: '#1e3828', // dark emerald tint
  9: '#1e2038', // dark indigo tint
  10: '#341e38', // dark fuchsia tint
  11: '#203820', // dark green tint
}

export const DARK_LANE_BORDER_COLORS: Record<string, string> = {
  0: '#89dceb', // Catppuccin Sky
  1: '#89b4fa', // Catppuccin Blue
  2: '#cba6f7', // Catppuccin Mauve
  3: '#f5c2e7', // Catppuccin Pink
  4: '#94e2d5', // Catppuccin Teal
  5: '#f9e2af', // Catppuccin Yellow
  6: '#f38ba8', // Catppuccin Red
  7: '#fab387', // Catppuccin Peach
  8: '#a6e3a1', // Catppuccin Green
  9: '#b4befe', // Catppuccin Lavender
  10: '#f5c2e7', // Catppuccin Pink (alt)
  11: '#a6e3a1', // Catppuccin Green (alt)
}

export function getLaneBorderColor(index: number): string {
  return LANE_BORDER_COLORS[index % LANE_COLOR_COUNT] ?? '#94a3b8'
}
