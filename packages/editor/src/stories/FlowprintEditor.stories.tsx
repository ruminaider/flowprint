import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { FlowprintEditor } from '../components/FlowprintEditor'

function ControlledEditor({
  initialDoc,
  readOnly,
}: {
  initialDoc: FlowprintDocument
  readOnly?: boolean
}) {
  const [doc, setDoc] = useState(initialDoc)
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <FlowprintEditor value={doc} onChange={setDoc} readOnly={readOnly} />
    </div>
  )
}

const emptyDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'empty',
  version: '1.0.0',
  lanes: {
    frontend: { label: 'Frontend', visibility: 'external', order: 0 },
    backend: { label: 'Backend', visibility: 'internal', order: 1 },
  },
  nodes: {},
}

const populatedDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test-flow',
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
      next: 'check_status',
    },
    check_status: {
      type: 'switch',
      lane: 'backend',
      label: 'Check Status',
      cases: [{ when: 'approved', next: 'done' }],
    },
    done: {
      type: 'terminal',
      lane: 'frontend',
      label: 'Done',
      outcome: 'success',
    },
  },
}

const meta: Meta = {
  title: 'Editor/FlowprintEditor',
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Empty: StoryObj = {
  render: () => <ControlledEditor initialDoc={emptyDoc} />,
}

export const WithNodes: StoryObj = {
  render: () => <ControlledEditor initialDoc={populatedDoc} />,
}

export const ReadOnly: StoryObj = {
  render: () => <ControlledEditor initialDoc={populatedDoc} readOnly />,
}
