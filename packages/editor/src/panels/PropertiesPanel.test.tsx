import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ParallelNode,
  WaitNode,
  TerminalNode,
  Lane,
} from '@ruminaider/flowprint-schema'
import { PropertiesPanel } from './PropertiesPanel'
import { TextField } from './fields/TextField'

const lanes: Record<string, Lane> = {
  customer: { label: 'Customer', visibility: 'external', order: 0 },
  support: { label: 'Support', visibility: 'internal', order: 1 },
}

const actionNode: ActionNode = {
  type: 'action',
  lane: 'customer',
  label: 'Submit Request',
  description: 'Customer submits a request',
  entry_points: [{ file: 'src/api.ts', symbol: 'submitRequest' }],
  error: { catch: 'handle_error', retry: { limit: 3, backoff: 'exponential' } },
  inputs: { orderId: 'ctx.orderId' },
  temporal: { start_to_close_timeout: '30s' },
  compensation: { file: 'src/comp.ts', symbol: 'rollback' },
}

const switchNode: SwitchNode = {
  type: 'switch',
  lane: 'support',
  label: 'Evaluate',
  cases: [
    { when: 'approved', next: 'process' },
    { when: 'rejected', next: 'notify' },
  ],
}

const parallelNode: ParallelNode = {
  type: 'parallel',
  lane: 'support',
  label: 'Parallel Check',
  branches: ['check_a', 'check_b'],
  join: 'merge',
  join_strategy: 'all_reached',
}

const waitNode: WaitNode = {
  type: 'wait',
  lane: 'customer',
  label: 'Wait for Payment',
  event: 'payment_received',
  timeout: '7d',
  timeout_next: 'handle_timeout',
}

const terminalNode: TerminalNode = {
  type: 'terminal',
  lane: 'customer',
  label: 'Done',
  outcome: 'success',
}

function makeDoc(
  nodes: Record<string, ActionNode | SwitchNode | ParallelNode | WaitNode | TerminalNode>,
): FlowprintDocument {
  return {
    schema: 'flowprint/1.0',
    name: 'test',
    version: '1.0.0',
    lanes,
    nodes,
  }
}

describe('PropertiesPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows placeholder when no node is selected', () => {
    const doc = makeDoc({ start: actionNode })
    render(<PropertiesPanel selectedNodeId={null} doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />)

    expect(screen.getByText('Select a node to edit')).toBeTruthy()
  })

  it('shows placeholder when selected node does not exist', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel
        selectedNodeId="nonexistent"
        doc={doc}
        onUpdateNode={vi.fn()}
        lanes={lanes}
      />,
    )

    expect(screen.getByText('Select a node to edit')).toBeTruthy()
  })

  it('renders common fields for an action node', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel selectedNodeId="start" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('action')).toBeTruthy()
    expect(screen.getByText('start')).toBeTruthy()
    expect(screen.getByDisplayValue('Submit Request')).toBeTruthy()
    expect(screen.getByDisplayValue('Customer submits a request')).toBeTruthy()
  })

  it('renders entry points and error handler for action node', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel selectedNodeId="start" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('Entry Points')).toBeTruthy()
    expect(screen.getByDisplayValue('src/api.ts')).toBeTruthy()
    expect(screen.getByDisplayValue('submitRequest')).toBeTruthy()
    expect(screen.getByText('Error Handler')).toBeTruthy()
    expect(screen.getByDisplayValue('handle_error')).toBeTruthy()
  })

  it('renders cases for switch node', () => {
    const doc = makeDoc({ evaluate: switchNode })
    render(
      <PropertiesPanel selectedNodeId="evaluate" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('switch')).toBeTruthy()
    expect(screen.getByText('Cases')).toBeTruthy()
    expect(screen.getByDisplayValue('approved')).toBeTruthy()
    expect(screen.getByDisplayValue('process')).toBeTruthy()
    expect(screen.getByDisplayValue('rejected')).toBeTruthy()
    expect(screen.getByDisplayValue('notify')).toBeTruthy()
  })

  it('renders join strategy for parallel node', () => {
    const doc = makeDoc({ fork_step: parallelNode })
    render(
      <PropertiesPanel selectedNodeId="fork_step" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('parallel')).toBeTruthy()
    expect(screen.getByLabelText('Join Strategy')).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const joinSelect: HTMLSelectElement = screen.getByLabelText(
      'Join Strategy',
    ) as HTMLSelectElement
    expect(joinSelect.value).toBe('all_reached')
  })

  it('renders wait event fields for wait node', () => {
    const doc = makeDoc({ await_payment: waitNode })
    render(
      <PropertiesPanel
        selectedNodeId="await_payment"
        doc={doc}
        onUpdateNode={vi.fn()}
        lanes={lanes}
      />,
    )

    expect(screen.getByText('wait')).toBeTruthy()
    expect(screen.getByDisplayValue('payment_received')).toBeTruthy()
    expect(screen.getByDisplayValue('7d')).toBeTruthy()
  })

  it('renders outcome selector for terminal node', () => {
    const doc = makeDoc({ done: terminalNode })
    render(<PropertiesPanel selectedNodeId="done" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />)

    expect(screen.getByText('terminal')).toBeTruthy()
    expect(screen.getByLabelText('Outcome')).toBeTruthy()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const outcomeSelect: HTMLSelectElement = screen.getByLabelText('Outcome') as HTMLSelectElement
    expect(outcomeSelect.value).toBe('success')
  })

  it('fires onUpdateNode when label is changed', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel
        selectedNodeId="start"
        doc={doc}
        onUpdateNode={onUpdateNode}
        lanes={lanes}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('Submit Request'), {
      target: { value: 'Updated Label' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('start', { label: 'Updated Label' })
  })

  it('fires onUpdateNode when lane is changed', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel
        selectedNodeId="start"
        doc={doc}
        onUpdateNode={onUpdateNode}
        lanes={lanes}
      />,
    )

    fireEvent.change(screen.getByLabelText('Lane'), {
      target: { value: 'support' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('start', { lane: 'support' })
  })

  it('fires onUpdateNode when switch case is edited', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ evaluate: switchNode })
    render(
      <PropertiesPanel
        selectedNodeId="evaluate"
        doc={doc}
        onUpdateNode={onUpdateNode}
        lanes={lanes}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('approved'), {
      target: { value: 'pending' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('evaluate', {
      cases: [
        { when: 'pending', next: 'process' },
        { when: 'rejected', next: 'notify' },
      ],
    })
  })

  it('fires onUpdateNode when outcome is changed', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ done: terminalNode })
    render(
      <PropertiesPanel selectedNodeId="done" doc={doc} onUpdateNode={onUpdateNode} lanes={lanes} />,
    )

    fireEvent.change(screen.getByLabelText('Outcome'), {
      target: { value: 'failure' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('done', { outcome: 'failure' })
  })

  it('fires onUpdateNode when join strategy is changed', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ fork_step: parallelNode })
    render(
      <PropertiesPanel
        selectedNodeId="fork_step"
        doc={doc}
        onUpdateNode={onUpdateNode}
        lanes={lanes}
      />,
    )

    fireEvent.change(screen.getByLabelText('Join Strategy'), {
      target: { value: 'await_all' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('fork_step', {
      join_strategy: 'await_all',
    })
  })

  it('fires onUpdateNode when wait event is changed', () => {
    const onUpdateNode = vi.fn()
    const doc = makeDoc({ await_payment: waitNode })
    render(
      <PropertiesPanel
        selectedNodeId="await_payment"
        doc={doc}
        onUpdateNode={onUpdateNode}
        lanes={lanes}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('payment_received'), {
      target: { value: 'order_shipped' },
    })

    expect(onUpdateNode).toHaveBeenCalledWith('await_payment', {
      event: 'order_shipped',
    })
  })

  it('renders InputsEditor for action node with inputs', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel selectedNodeId="start" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('Inputs')).toBeTruthy()
    expect(screen.getByDisplayValue('orderId')).toBeTruthy()
  })

  it('renders TemporalConfigEditor for action node with temporal', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel selectedNodeId="start" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('Temporal Config')).toBeTruthy()
    expect(screen.getByDisplayValue('30s')).toBeTruthy()
  })

  it('renders CompensationEditor for action node with compensation', () => {
    const doc = makeDoc({ start: actionNode })
    render(
      <PropertiesPanel selectedNodeId="start" doc={doc} onUpdateNode={vi.fn()} lanes={lanes} />,
    )

    expect(screen.getByText('Compensation')).toBeTruthy()
    expect(screen.getByDisplayValue('src/comp.ts')).toBeTruthy()
    expect(screen.getByDisplayValue('rollback')).toBeTruthy()
  })

  it('renders timeout_next field for wait node', () => {
    const doc = makeDoc({ await_payment: waitNode })
    render(
      <PropertiesPanel
        selectedNodeId="await_payment"
        doc={doc}
        onUpdateNode={vi.fn()}
        lanes={lanes}
      />,
    )

    expect(screen.getByLabelText('Timeout Next')).toBeTruthy()
    expect(screen.getByDisplayValue('handle_timeout')).toBeTruthy()
  })
})

describe('TextField', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders label and value', () => {
    render(<TextField label="Name" value="hello" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Name')).toBeTruthy()
    expect(screen.getByDisplayValue('hello')).toBeTruthy()
  })

  it('calls onChange with new value on input change', () => {
    const onChange = vi.fn()
    render(<TextField label="Name" value="hello" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'world' },
    })

    expect(onChange).toHaveBeenCalledWith('world')
  })

  it('renders empty input when value is empty string', () => {
    render(<TextField label="Name" value="" onChange={vi.fn()} />)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const nameInput: HTMLInputElement = screen.getByLabelText('Name') as HTMLInputElement
    expect(nameInput.value).toBe('')
  })
})
