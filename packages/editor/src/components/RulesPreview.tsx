/**
 * Read-only preview of referenced rules.
 *
 * Renders a DecisionTable when rules data is available, and shows
 * an empty state or validation errors otherwise.
 */

import { DecisionTable } from './DecisionTable'
import type { RulesData } from './DecisionTable'

export interface RulesRef {
  file: string
  evaluator?: string
}

export interface RulesPreviewProps {
  rulesRef: RulesRef
  rulesData?: RulesData
  validationErrors?: string[]
  onRequestEdit?: () => void
}

export function RulesPreview({
  rulesRef,
  rulesData,
  validationErrors,
  onRequestEdit,
}: RulesPreviewProps) {
  const hasErrors = validationErrors && validationErrors.length > 0

  return (
    <div className="fp-rules-preview" data-testid="rules-preview">
      <div className="fp-rules-preview__header">
        <span className="fp-rules-preview__title">{rulesRef.file}</span>
        <span
          className={`fp-rules-preview__status ${
            hasErrors
              ? 'fp-rules-preview__status--error'
              : 'fp-rules-preview__status--valid'
          }`}
          data-testid="rules-validation-status"
        >
          {hasErrors ? 'Invalid' : 'Valid'}
        </span>
      </div>

      {hasErrors && (
        <ul className="fp-rules-preview__errors" data-testid="rules-validation-errors">
          {validationErrors.map((error, idx) => (
            <li key={idx} className="fp-rules-preview__error-item">
              {error}
            </li>
          ))}
        </ul>
      )}

      <div className="fp-rules-preview__body">
        {rulesData ? (
          <DecisionTable rules={rulesData} />
        ) : (
          <div className="fp-rules-preview__empty" data-testid="rules-preview-empty">
            No rules data available
          </div>
        )}
      </div>

      {onRequestEdit && (
        <div className="fp-rules-preview__footer">
          <button type="button" onClick={onRequestEdit}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}
