/**
 * Rules reference editor.
 *
 * Provides a file path input for the `.rules.yaml` reference, an evaluator
 * selector, and a toggle between rules mode and entry_points/cases mode
 * that enforces mutual exclusion.
 */

export interface RulesRef {
  file: string
  evaluator?: string
}

export interface RulesRefEditorProps {
  rulesRef?: RulesRef
  onChange: (ref: RulesRef | undefined) => void
  /** Whether the parent node currently has a rules reference */
  hasRules: boolean
  /** Whether the parent node currently has cases or entry_points */
  hasCasesOrEntryPoints: boolean
  /** Label for the non-rules mode (e.g., "Entry Points" for action, "Cases" for switch) */
  alternateLabel?: string
}

export function RulesRefEditor(props: RulesRefEditorProps) {
  const {
    rulesRef,
    onChange,
    hasRules,
    alternateLabel = 'Entry Points / Cases',
  } = props
  const isRulesMode = hasRules

  function handleToggleToRules() {
    if (isRulesMode) return
    onChange({ file: '', evaluator: 'builtin' })
  }

  function handleToggleFromRules() {
    if (!isRulesMode) return
    onChange(undefined)
  }

  function handleFileChange(file: string) {
    onChange({
      file,
      evaluator: rulesRef?.evaluator ?? 'builtin',
    })
  }

  function handleEvaluatorChange(evaluator: string) {
    onChange({
      file: rulesRef?.file ?? '',
      evaluator,
    })
  }

  return (
    <div className="fp-rules-editor" data-testid="rules-ref-editor">
      <div className="fp-rules-editor__toggle" data-testid="rules-toggle">
        <button
          type="button"
          className={`fp-rules-editor__toggle-option ${
            !isRulesMode ? 'fp-rules-editor__toggle-option--active' : ''
          }`}
          onClick={handleToggleFromRules}
          data-testid="toggle-alternate"
        >
          {alternateLabel}
        </button>
        <button
          type="button"
          className={`fp-rules-editor__toggle-option ${
            isRulesMode ? 'fp-rules-editor__toggle-option--active' : ''
          }`}
          onClick={handleToggleToRules}
          data-testid="toggle-rules"
        >
          Rules
        </button>
      </div>

      {isRulesMode && (
        <>
          <div className="fp-rules-editor__field">
            <label className="fp-rules-editor__label" htmlFor="rules-file-path">
              Rules File
            </label>
            <input
              id="rules-file-path"
              className="fp-rules-editor__input"
              type="text"
              value={rulesRef?.file ?? ''}
              onChange={(e) => {
                handleFileChange(e.target.value)
              }}
              placeholder="path/to/rules.rules.yaml"
              data-testid="rules-file-input"
            />
          </div>

          <div className="fp-rules-editor__field">
            <label className="fp-rules-editor__label" htmlFor="rules-evaluator">
              Evaluator
            </label>
            <select
              id="rules-evaluator"
              className="fp-rules-editor__select"
              value={rulesRef?.evaluator ?? 'builtin'}
              onChange={(e) => {
                handleEvaluatorChange(e.target.value)
              }}
              data-testid="rules-evaluator-select"
            >
              <option value="builtin">Built-in</option>
            </select>
          </div>
        </>
      )}
    </div>
  )
}
