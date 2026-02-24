import { MousePointer2, Hand, Search, LayoutGrid } from 'lucide-react'
import { Island } from './Island'
import { ToolbarButton } from './ToolbarButton'
import { getAllNodeSpecs } from '../nodes/registry'

export interface ToolbarProps {
  activeTool: string
  onToolChange: (tool: string) => void
  onAddNode: (type: string) => void
  onCommandPalette: () => void
  onTidyLayout: () => void
}

export function Toolbar({
  activeTool,
  onToolChange,
  onAddNode,
  onCommandPalette,
  onTidyLayout,
}: ToolbarProps) {
  const nodeSpecs = getAllNodeSpecs()

  return (
    <Island className="fp-toolbar">
      {/* Group 1: Navigation */}
      <div className="fp-toolbar__group">
        <ToolbarButton
          icon={MousePointer2}
          label="Select"
          shortcut="V"
          active={activeTool === 'select'}
          onClick={() => { onToolChange('select') }}
        />
        <ToolbarButton
          icon={Hand}
          label="Hand"
          shortcut="H"
          active={activeTool === 'hand'}
          onClick={() => { onToolChange('hand') }}
        />
      </div>

      <div className="fp-toolbar__divider" />

      {/* Group 2: Nodes */}
      <div className="fp-toolbar__group">
        {nodeSpecs.map((spec) => (
          <ToolbarButton
            key={spec.type}
            icon={spec.icon}
            label={spec.displayName}
            shortcut={spec.shortcut}
            colorVar={spec.color}
            onClick={() => { onAddNode(spec.type) }}
          />
        ))}
      </div>

      <div className="fp-toolbar__divider" />

      {/* Group 3: Utility */}
      <div className="fp-toolbar__group">
        <ToolbarButton
          icon={Search}
          label="Command Palette"
          shortcut="Cmd+K"
          onClick={onCommandPalette}
        />
        <ToolbarButton
          icon={LayoutGrid}
          label="Tidy Layout"
          onClick={onTidyLayout}
        />
      </div>
    </Island>
  )
}
