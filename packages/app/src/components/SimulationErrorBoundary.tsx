import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset: () => void
}

interface State {
  error: Error | null
}

export class SimulationErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[SimulationPanel] Uncaught error:', error, info)
  }

  handleReset = (): void => {
    this.setState({ error: null })
    this.props.onReset()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            background: 'var(--bg-surface, #1e1e2e)',
            borderTop: '1px solid var(--border, #45475a)',
            color: 'var(--fg-muted, #a6adc8)',
            fontSize: 13,
          }}
        >
          <p style={{ margin: '0 0 8px', color: 'var(--fp-error, #f38ba8)' }}>
            Simulation panel crashed: {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '4px 12px',
              background: 'var(--bg-element, #313244)',
              border: '1px solid var(--border, #45475a)',
              borderRadius: 4,
              color: 'var(--fg, #cdd6f4)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Stop Simulation
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
