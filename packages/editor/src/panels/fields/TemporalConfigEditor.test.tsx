import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TemporalConfigEditor } from './TemporalConfigEditor'

describe('TemporalConfigEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders disabled state', () => {
    render(<TemporalConfigEditor config={undefined} onChange={vi.fn()} />)

    expect(screen.getByText('Temporal Config')).toBeTruthy()
    expect(screen.getByLabelText('Add temporal config')).toBeTruthy()
  })

  it('toggles config on', () => {
    const onChange = vi.fn()
    render(<TemporalConfigEditor config={undefined} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Add temporal config'))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('toggles config off', () => {
    const onChange = vi.fn()
    render(<TemporalConfigEditor config={{}} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('Remove temporal config'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('changes a timeout field', () => {
    const onChange = vi.fn()
    render(<TemporalConfigEditor config={{}} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Start-to-close timeout'), {
      target: { value: '30s' },
    })
    expect(onChange).toHaveBeenCalledWith({ start_to_close_timeout: '30s' })
  })

  it('changes a retry field', () => {
    const onChange = vi.fn()
    render(<TemporalConfigEditor config={{ retry: { max_attempts: 3 } }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Initial interval'), {
      target: { value: '1s' },
    })
    expect(onChange).toHaveBeenCalledWith({
      retry: { max_attempts: 3, initial_interval: '1s' },
    })
  })

  it('changes max attempts', () => {
    const onChange = vi.fn()
    render(<TemporalConfigEditor config={{}} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Max attempts'), {
      target: { value: '5' },
    })
    expect(onChange).toHaveBeenCalledWith({ retry: { max_attempts: 5 } })
  })

  it('renders all timeout fields when config is provided', () => {
    render(
      <TemporalConfigEditor
        config={{
          start_to_close_timeout: '30s',
          schedule_to_close_timeout: '1h',
          heartbeat_timeout: '10s',
        }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByDisplayValue('30s')).toBeTruthy()
    expect(screen.getByDisplayValue('1h')).toBeTruthy()
    expect(screen.getByDisplayValue('10s')).toBeTruthy()
  })
})
