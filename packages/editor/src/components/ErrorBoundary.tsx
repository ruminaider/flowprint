import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  serialize,
  validate,
  type FlowprintDocument,
  type ValidationError,
} from '@ruminaider/flowprint-schema'

/**
 * Props for {@link ErrorBoundary}.
 */
export interface ErrorBoundaryProps {
  /** The child component tree to wrap. */
  children: ReactNode
  /** The current document, used to render a YAML dump in the error fallback. */
  doc: FlowprintDocument
  /** Optional callback fired when the user clicks the Reset button. */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React error boundary that catches rendering errors in the editor.
 *
 * When an error is caught, displays a fallback UI showing the error message,
 * the current document serialized as YAML (via `serialize()`), and any
 * validation errors. Provides a Reset button to recover.
 *
 * @example
 * ```tsx
 * <ErrorBoundary doc={doc}>
 *   <FlowprintEditor value={doc} onChange={setDoc} />
 * </ErrorBoundary>
 * ```
 */
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
