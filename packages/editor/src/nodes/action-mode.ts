import type { ComponentType } from 'react'
import { Zap } from 'lucide-react'
import { CalculatorIcon, TableIcon } from '../components/icons'

export type ActionMode = 'transform' | 'decision-table' | 'handler'

interface ActionModeInfo {
  mode: ActionMode
  icon: ComponentType<{ size?: number; className?: string }>
  subtitle: string
}

const MODE_MAP: Record<ActionMode, Omit<ActionModeInfo, 'mode'>> = {
  transform: { icon: CalculatorIcon, subtitle: 'Transform' },
  'decision-table': { icon: TableIcon, subtitle: 'Decision Table' },
  handler: { icon: Zap, subtitle: '' },
}

/**
 * Determine the action mode from node data.
 * - `expressions` present -> transform (engine-native)
 * - `rules` present -> decision-table
 * - otherwise -> handler (default)
 */
export function getActionMode(data: Record<string, unknown>): ActionMode {
  if (data.expressions && typeof data.expressions === 'object') return 'transform'
  if (data.rules && typeof data.rules === 'object') return 'decision-table'
  return 'handler'
}

export function getActionModeInfo(data: Record<string, unknown>): ActionModeInfo {
  const mode = getActionMode(data)
  return { mode, ...MODE_MAP[mode] }
}
