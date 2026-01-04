import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  serialize,
  validate,
  type FlowprintDocument,
  type ValidationError,
} from '@ruminaider/flowprint-schema'

export interface ErrorBoundaryProps {
  children: ReactNode
  doc: FlowprintDocument
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[FlowprintEditor] Uncaught error:', error, info)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { doc } = this.props

      let yaml: string
      try {
        yaml = serialize(doc)
      } catch {
        yaml = '# Failed to serialize document'
      }

      let validationErrors: ValidationError[] = []
      try {
        const result = validate(doc)
        validationErrors = result.errors
      } catch {
        // validation itself failed — skip
      }

      return (
        <div className="fp-error-boundary">
          <div className="fp-error-fallback">
            <h2>Something went wrong</h2>
            <p>{this.state.error.message}</p>

            <h3>Document YAML</h3>
            <pre className="fp-error-yaml-preview">{yaml}</pre>

            {validationErrors.length > 0 && (
              <>
                <h3>Validation Errors</h3>
                <ul>
                  {validationErrors.map((err, i) => (
                    <li key={i}>
                      <strong>{err.path}</strong>: {err.message} ({err.severity})
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button type="button" onClick={this.handleReset}>
              Reset
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
