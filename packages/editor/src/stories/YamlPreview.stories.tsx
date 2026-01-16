import type { Meta, StoryObj } from '@storybook/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { YamlPreviewPanel } from '../panels/YamlPreviewPanel'

const sampleDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'preview-demo',
  version: '1.0.0',
  lanes: {
    frontend: { label: 'Frontend', visibility: 'external', order: 0 },
    backend: { label: 'Backend', visibility: 'internal', order: 1 },
  },
  nodes: {
    start_action: {
      type: 'action',
      lane: 'frontend',
      label: 'Start Action',
      next: 'process_data',
      entry_points: [{ file: 'src/main.ts', symbol: 'handleStart' }],
    },
    process_data: {
      type: 'action',
      lane: 'backend',
      label: 'Process Data',
      next: 'done',
    },
    done: {
      type: 'terminal',
      lane: 'frontend',
      label: 'Complete',
      outcome: 'success',
    },
  },
}

const meta: Meta = {
  title: 'Panels/YamlPreview',
  parameters: { layout: 'padded' },
}
export default meta

export const Visible: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', width: '400px', height: '500px' }}>
      <YamlPreviewPanel doc={sampleDoc} visible />
    </div>
  ),
}

export const Hidden: StoryObj = {
  render: () => (
    <div style={{ position: 'relative', width: '400px', height: '500px' }}>
      <YamlPreviewPanel doc={sampleDoc} visible={false} />
    </div>
  ),
}
