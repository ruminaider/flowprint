import type { Meta, StoryObj } from '@storybook/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { FlowprintViewer } from '../components/FlowprintViewer'

const meta: Meta<typeof FlowprintViewer> = {
  title: 'FlowprintViewer',
  component: FlowprintViewer,
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof FlowprintViewer>

const prescriptionFulfillment: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'prescription-fulfillment',
  version: '1.0.0',
  description: 'End-to-end prescription fulfillment from consultation through delivery',
  metadata: { owner: 'care-team', domain: 'pharmacy' },
  lanes: {
    patient: { label: 'Patient Actions', visibility: 'external', order: 0 },
    frontstage: { label: 'Frontstage', visibility: 'external', order: 1 },
    backstage: { label: 'Backstage', visibility: 'internal', order: 2 },
    support: { label: 'External Partners', visibility: 'internal', order: 3 },
  },
  nodes: {
    complete_consultation: {
      type: 'action',
      lane: 'frontstage',
      label: 'Complete Consultation',
      entry_points: [{ file: 'backend/consults/wheel/tasks.py', symbol: 'send_wheel_consult' }],
      next: 'evaluate_treatment',
    },
    evaluate_treatment: {
      type: 'switch',
      lane: 'backstage',
      label: 'Treatment Decision',
      description: 'Provider evaluates consultation results and determines treatment path',
      cases: [
        { when: 'needs_prescription', next: 'create_prescription' },
        { when: 'otc_only', next: 'recommend_otc' },
      ],
      default: 'create_prescription',
    },
    create_prescription: {
      type: 'action',
      lane: 'backstage',
      label: 'Create Prescription',
      entry_points: [{ file: 'backend/care/service.py', symbol: 'create_prescription' }],
      next: 'fulfill_order',
    },
    fulfill_order: {
      type: 'parallel',
      lane: 'backstage',
      label: 'Fulfill Order',
      branches: ['submit_to_pharmacy', 'notify_patient'],
      join: 'delivery_tracking',
      join_strategy: 'all_reached',
    },
    submit_to_pharmacy: {
      type: 'action',
      lane: 'support',
      label: 'Submit to Pharmacy',
      entry_points: [{ file: 'backend/shipping/precision/client.py', symbol: 'submit_order' }],
      next: 'delivery_tracking',
      error: { retry: { limit: 3, backoff: 'exponential' }, catch: 'pharmacy_submission_failed' },
    },
    notify_patient: {
      type: 'action',
      lane: 'frontstage',
      label: 'Notify Patient of Order',
      entry_points: [
        { file: 'backend/notifications/service.py', symbol: 'send_order_confirmation' },
      ],
      next: 'delivery_tracking',
    },
    delivery_tracking: {
      type: 'wait',
      lane: 'support',
      label: 'Await Delivery Confirmation',
      event: 'delivery.confirmed',
      timeout: '7d',
      next: 'order_complete',
      timeout_next: 'order_failed',
    },
    pharmacy_submission_failed: {
      type: 'error',
      lane: 'frontstage',
      label: 'Handle Pharmacy Error',
      entry_points: [
        { file: 'backend/notifications/service.py', symbol: 'send_pharmacy_error_notification' },
      ],
      next: 'order_failed',
    },
    order_complete: {
      type: 'terminal',
      lane: 'patient',
      label: 'Order Complete',
      outcome: 'success',
    },
    order_failed: {
      type: 'terminal',
      lane: 'patient',
      label: 'Order Failed',
      outcome: 'failure',
    },
    recommend_otc: {
      type: 'action',
      lane: 'frontstage',
      label: 'Recommend OTC Products',
      entry_points: [
        { file: 'backend/care/otc_service.py', symbol: 'generate_otc_recommendations' },
      ],
      next: 'order_complete',
    },
  },
}

export const PrescriptionFulfillment: Story = {
  args: {
    document: prescriptionFulfillment,
  },
}

const singleNode: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'single-node',
  version: '1.0.0',
  lanes: {
    main: { label: 'Main', visibility: 'external', order: 0 },
  },
  nodes: {
    only_node: {
      type: 'action',
      lane: 'main',
      label: 'Only Node',
    },
  },
}

export const SingleNode: Story = {
  args: {
    document: singleNode,
  },
}

const emptyBlueprint: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'empty',
  version: '1.0.0',
  lanes: {
    main: { label: 'Main', visibility: 'external', order: 0 },
  },
  nodes: {},
}

export const EmptyBlueprint: Story = {
  args: {
    document: emptyBlueprint,
  },
}
