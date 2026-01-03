import type { Meta, StoryObj } from '@storybook/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { FlowprintViewer } from '../components/FlowprintViewer'

const meta: Meta<typeof FlowprintViewer> = {
  title: 'Node Types',
  component: FlowprintViewer,
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '600px' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof FlowprintViewer>

function makeDoc(nodeId: string, node: FlowprintDocument['nodes'][string]): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: `${node.type}-demo`,
    version: '1.0.0',
    lanes: {
      main: { label: 'Main Lane', visibility: 'external', order: 0 },
    },
    nodes: { [nodeId]: node },
  }
}

export const ActionNodeStory: Story = {
  name: 'Action Node',
  args: {
    document: makeDoc('my_action', {
      type: 'action',
      lane: 'main',
      label: 'Process Request',
      entry_points: [{ file: 'service.py', symbol: 'handle_request' }],
    }),
  },
}

export const SwitchNodeStory: Story = {
  name: 'Switch Node',
  args: {
    document: {
      schema: 'flowprint/1.0',
      name: 'switch-demo',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main Lane', visibility: 'external', order: 0 },
      },
      nodes: {
        start: {
          type: 'action',
          lane: 'main',
          label: 'Start',
          next: 'decision',
        },
        decision: {
          type: 'switch',
          lane: 'main',
          label: 'Route Decision',
          cases: [
            { when: 'approved', next: 'success' },
            { when: 'denied', next: 'failure' },
          ],
          default: 'failure',
        },
        success: {
          type: 'terminal',
          lane: 'main',
          label: 'Approved',
          outcome: 'success',
        },
        failure: {
          type: 'terminal',
          lane: 'main',
          label: 'Denied',
          outcome: 'failure',
        },
      },
    },
  },
}

export const ParallelNodeStory: Story = {
  name: 'Parallel Node',
  args: {
    document: {
      schema: 'flowprint/1.0',
      name: 'parallel-demo',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main Lane', visibility: 'external', order: 0 },
      },
      nodes: {
        fork: {
          type: 'parallel',
          lane: 'main',
          label: 'Fork Work',
          branches: ['branch_a', 'branch_b'],
          join: 'done',
          join_strategy: 'all_reached',
        },
        branch_a: {
          type: 'action',
          lane: 'main',
          label: 'Branch A',
          next: 'done',
        },
        branch_b: {
          type: 'action',
          lane: 'main',
          label: 'Branch B',
          next: 'done',
        },
        done: {
          type: 'terminal',
          lane: 'main',
          label: 'Done',
          outcome: 'success',
        },
      },
    },
  },
}

export const WaitNodeStory: Story = {
  name: 'Wait Node',
  args: {
    document: makeDoc('wait_event', {
      type: 'wait',
      lane: 'main',
      label: 'Await Payment',
      event: 'payment.received',
      timeout: '24h',
    }),
  },
}

export const ErrorNodeStory: Story = {
  name: 'Error Node',
  args: {
    document: makeDoc('handle_error', {
      type: 'error',
      lane: 'main',
      label: 'Handle Failure',
    }),
  },
}

export const TerminalNodeStory: Story = {
  name: 'Terminal Node',
  args: {
    document: {
      schema: 'flowprint/1.0',
      name: 'terminal-demo',
      version: '1.0.0',
      lanes: {
        main: { label: 'Main Lane', visibility: 'external', order: 0 },
      },
      nodes: {
        success: {
          type: 'terminal',
          lane: 'main',
          label: 'Success',
          outcome: 'success',
        },
        failure: {
          type: 'terminal',
          lane: 'main',
          label: 'Failure',
          outcome: 'failure',
        },
      },
    },
  },
}
