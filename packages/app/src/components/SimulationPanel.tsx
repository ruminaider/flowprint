import { useState, useCallback, useEffect } from 'react'
import type { UseSimulationReturn } from '../hooks/useSimulation'
import type { TemplateScenario } from '../data/template-scenarios'

export interface SimulationPanelProps {
  simulation: UseSimulationReturn
  scenarios?: TemplateScenario[]
  onSelectScenario?: (scenario: TemplateScenario | null) => void
}

const panelStyle: React.CSSProperties = {
  borderTop: '1px solid #2E2D3D',
  background: 'rgba(10, 10, 15, 0.95)',
  color: '#E8E7F4',
  fontFamily: 'var(--fp-font-sans, system-ui, sans-serif)',
  fontSize: 13,
  overflow: 'auto',
  maxHeight: 320,
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderBottom: '1px solid #2E2D3D',
}

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 16px',
  borderBottom: '1px solid #2E2D3D',
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 11,
  border: '1px solid #2E2D3D',
  borderRadius: 6,
  background: '#1C1B25',
  color: '#E8E7F4',
  cursor: 'pointer',
}

const btnActiveStyle: React.CSSProperties = {
  ...btnStyle,
  background: '#a6e3a1',
  color: '#1e1e2e',
  borderColor: '#a6e3a1',
}

const detailStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  lineHeight: 1.6,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontSize: 10,
  fontWeight: 600,
  borderRadius: 4,
  textTransform: 'uppercase',
}

const inputAreaStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderBottom: '1px solid #2E2D3D',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 60,
  padding: 8,
  fontSize: 12,
  fontFamily: 'monospace',
  background: '#1C1B25',
  color: '#E8E7F4',
  border: '1px solid #2E2D3D',
  borderRadius: 6,
  resize: 'vertical',
}

const MAX_INPUT_BYTES = 256 * 1024 // 256KB (Review #27)

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: '#a6e3a1', fg: '#1e1e2e' },
    matched: { bg: '#89b4fa', fg: '#1e1e2e' },
    activated: { bg: '#b4befe', fg: '#1e1e2e' },
    error: { bg: '#f38ba8', fg: '#1e1e2e' },
    handled: { bg: '#fab387', fg: '#1e1e2e' },
    reached: { bg: '#cdd6f4', fg: '#1e1e2e' },
    default: { bg: '#585b70', fg: '#cdd6f4' },
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- default is always defined
  const c = colors[status] ?? colors.default!
  return (
    <span style={{ ...badgeStyle, background: c.bg, color: c.fg }}>
      {status}
    </span>
  )
}

function buildCumulativeContext(
  steps: {
    stepOutput?: { nodeId: string; value: unknown }
    branchOutputs?: Record<string, unknown>
  }[],
  upToIndex: number,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {}
  for (let i = 0; i <= upToIndex; i++) {
    const step = steps[i]
    if (step?.stepOutput) ctx[step.stepOutput.nodeId] = step.stepOutput.value
    if (step?.branchOutputs) {
      for (const [branchId, value] of Object.entries(step.branchOutputs)) {
        ctx[branchId] = value
      }
    }
  }
  return ctx
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: 12,
  fontFamily: 'var(--fp-font-sans, system-ui, sans-serif)',
  background: '#1C1B25',
  color: '#E8E7F4',
  border: '1px solid #2E2D3D',
  borderRadius: 6,
  cursor: 'pointer',
}

export function SimulationPanel({ simulation, scenarios, onSelectScenario }: SimulationPanelProps) {
  const [inputText, setInputText] = useState('{}')
  const [fixturesText, setFixturesText] = useState('')
  const [showFixtures, setShowFixtures] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)

  const hasScenarios = scenarios && scenarios.length > 0
  const selectedScenario = hasScenarios
    ? scenarios.find((s) => s.id === selectedScenarioId) ?? null
    : null

  const handleSelectScenario = useCallback(
    (scenarioId: string) => {
      if (scenarioId === '') {
        setSelectedScenarioId(null)
        onSelectScenario?.(null)
        return
      }
      const scenario = scenarios?.find((s) => s.id === scenarioId)
      if (!scenario) return
      setSelectedScenarioId(scenarioId)
      setInputText(JSON.stringify(scenario.input, null, 2))
      setFixturesText(JSON.stringify(scenario.fixtures ?? {}, null, 2))
      if (scenario.fixtures && Object.keys(scenario.fixtures).length > 0) {
        setShowFixtures(true)
      }
      setInputError(null)
      onSelectScenario?.(scenario)
    },
    [scenarios, onSelectScenario],
  )

  const handleInputChange = useCallback(
    (value: string) => {
      setInputText(value)
      if (selectedScenarioId) {
        setSelectedScenarioId(null)
        onSelectScenario?.(null)
      }
    },
    [selectedScenarioId, onSelectScenario],
  )

  const handleFixturesChange = useCallback(
    (value: string) => {
      setFixturesText(value)
      if (selectedScenarioId) {
        setSelectedScenarioId(null)
        onSelectScenario?.(null)
      }
    },
    [selectedScenarioId, onSelectScenario],
  )

  const {
    isActive,
    trace,
    currentStep,
    totalSteps,
    currentNodeId,
    currentStepData,
    error,
    start,
    stop,
    stepForward,
    stepBack,
    reset,
    setAutoPlay,
    isAutoPlaying,
    playbackSpeed,
    setPlaybackSpeed,
  } = simulation

  const handleRun = useCallback(() => {
    // Review #27: byte-size guard
    if (new Blob([inputText]).size > MAX_INPUT_BYTES) {
      setInputError('Input exceeds 256KB limit')
      return
    }

    let input: unknown
    try {
      input = JSON.parse(inputText)
      setInputError(null)
    } catch {
      setInputError('Invalid JSON input')
      return
    }

    let fixtures: Record<string, unknown> | undefined
    if (fixturesText.trim()) {
      try {
        fixtures = JSON.parse(fixturesText) as Record<string, unknown>
      } catch {
        setInputError('Invalid JSON fixtures')
        return
      }
    }

    start(input, fixtures)
  }, [inputText, fixturesText, start])

  // Review #37: keyboard shortcuts scoped to active simulation
  useEffect(() => {
    if (!isActive) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          stepForward()
          break
        case 'ArrowLeft':
          e.preventDefault()
          stepBack()
          break
        case ' ':
          e.preventDefault()
          setAutoPlay(!isAutoPlaying)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, stepForward, stepBack, setAutoPlay, isAutoPlaying])

  // Input form (shown when simulation is not active)
  if (!isActive) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600 }}>Simulation</span>
          <button type="button" onClick={stop} style={btnStyle}>
            Close
          </button>
        </div>

        {hasScenarios && (
          <div style={inputAreaStyle}>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#8887A5' }}>
              Example Scenario
            </label>
            <select
              value={selectedScenarioId ?? ''}
              onChange={(e) => { handleSelectScenario(e.target.value) }}
              style={selectStyle}
            >
              <option value="">Custom input</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {selectedScenario && (
              <div style={{ fontSize: 11, color: '#8887A5', marginTop: 4 }}>
                {selectedScenario.description}
              </div>
            )}
          </div>
        )}

        <div style={inputAreaStyle}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#8887A5' }}>
            Input JSON
          </label>
          <textarea
            value={inputText}
            onChange={(e) => { handleInputChange(e.target.value) }}
            style={textareaStyle}
            placeholder='{"key": "value"}'
          />
        </div>

        <div style={{ padding: '4px 16px' }}>
          <button
            type="button"
            onClick={() => { setShowFixtures(!showFixtures) }}
            style={{ ...btnStyle, fontSize: 10, padding: '2px 8px' }}
          >
            {showFixtures ? 'Hide' : 'Show'} Fixtures
          </button>
        </div>

        {showFixtures && (
          <div style={inputAreaStyle}>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#8887A5' }}>
              Fixtures JSON (optional)
            </label>
            <textarea
              value={fixturesText}
              onChange={(e) => { handleFixturesChange(e.target.value) }}
              style={textareaStyle}
              placeholder='{"wait_node_id": {"event": "data"}}'
            />
          </div>
        )}

        {(inputError ?? error) && (
          <div style={{ padding: '4px 16px', color: '#f38ba8', fontSize: 12 }}>
            {inputError ?? error}
          </div>
        )}

        <div style={{ padding: '8px 16px' }}>
          <button type="button" onClick={handleRun} style={btnActiveStyle}>
            Run
          </button>
        </div>
      </div>
    )
  }

  // Active simulation view
  const cumulativeContext = trace
    ? buildCumulativeContext(trace.steps, currentStep)
    : {}

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Review #38: step counter */}
          <span style={{ fontWeight: 600 }}>
            Step {currentStep + 1} of {totalSteps}
          </span>
          {currentNodeId && (
            <span style={{ color: '#8887A5' }}>{currentNodeId}</span>
          )}
          {currentStepData && <StatusBadge status={currentStepData.status} />}
        </div>
        <button type="button" onClick={stop} style={btnStyle}>
          Close
        </button>
      </div>

      {/* Controls */}
      <div style={controlsStyle}>
        <button type="button" onClick={reset} style={btnStyle} title="Reset">
          |&lt;
        </button>
        <button type="button" onClick={stepBack} style={btnStyle} title="Step Back (Left Arrow)">
          &lt;
        </button>
        <button
          type="button"
          onClick={stepForward}
          style={btnStyle}
          title="Step Forward (Right Arrow)"
        >
          &gt;
        </button>
        <button
          type="button"
          onClick={() => { setAutoPlay(!isAutoPlaying) }}
          style={isAutoPlaying ? btnActiveStyle : btnStyle}
          title="Auto-play (Space)"
        >
          {isAutoPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Speed buttons */}
        <span style={{ color: '#8887A5', fontSize: 10, marginLeft: 4 }}>Speed:</span>
        {[0.5, 1, 2, 4].map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => { setPlaybackSpeed(speed) }}
            style={playbackSpeed === speed ? btnActiveStyle : btnStyle}
            title={`${String(speed)}x speed`}
          >
            {speed}x
          </button>
        ))}

        <button type="button" onClick={stop} style={{ ...btnStyle, color: '#f38ba8' }}>
          Stop
        </button>

        {/* Review #38: progress scrubber */}
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={currentStep}
          onChange={(e) => {
            if (isAutoPlaying) {
              setAutoPlay(false)
            }
            simulation.goToStep(Number(e.target.value))
          }}
          style={{ flex: 1, marginLeft: 8, accentColor: '#a6e3a1' }}
          title={`Step ${String(currentStep + 1)} of ${String(totalSteps)}`}
        />
      </div>

      {/* Detail area */}
      {currentStepData && (
        <div style={detailStyle}>
          {/* Rules evaluation detail */}
          {currentStepData.rulesEvaluation && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Rules Evaluation</div>
              <div>
                File: <code style={{ color: '#89b4fa' }}>{currentStepData.rulesEvaluation.file}</code>
              </div>
              <div>
                Hit Policy:{' '}
                <span style={{ ...badgeStyle, background: '#585b70', color: '#cdd6f4' }}>
                  {currentStepData.rulesEvaluation.hitPolicy}
                </span>{' '}
                Matched: {currentStepData.rulesEvaluation.matchedCount}
              </div>
              <pre
                style={{
                  background: '#1C1B25',
                  padding: 8,
                  borderRadius: 6,
                  fontSize: 11,
                  overflow: 'auto',
                  maxHeight: 100,
                  marginTop: 4,
                }}
              >
                {JSON.stringify(currentStepData.rulesEvaluation.output, null, 2)}
              </pre>
            </div>
          )}

          {/* Expression evaluation detail */}
          {currentStepData.expressionEvaluation && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Expression</div>
              <code style={{ color: '#89b4fa' }}>
                {currentStepData.expressionEvaluation.expression}
              </code>
              <span style={{ color: '#8887A5' }}>
                {' '} = {JSON.stringify(currentStepData.expressionEvaluation.result)}
              </span>
            </div>
          )}

          {/* Next node */}
          {currentStepData.next && (
            <div style={{ color: '#8887A5' }}>
              Next: <code>{currentStepData.next}</code>
            </div>
          )}

          {/* Error */}
          {currentStepData.error && (
            <div style={{ color: '#f38ba8', marginTop: 4 }}>
              {currentStepData.error}
            </div>
          )}
        </div>
      )}

      {/* Context viewer */}
      <div style={{ borderTop: '1px solid #2E2D3D' }}>
        <button
          type="button"
          onClick={() => { setShowContext(!showContext) }}
          style={{
            ...btnStyle,
            width: '100%',
            textAlign: 'left',
            border: 'none',
            borderRadius: 0,
            padding: '6px 16px',
          }}
        >
          {showContext ? 'Hide' : 'Show'} Context ({Object.keys(cumulativeContext).length} entries)
        </button>
        {showContext && (
          <pre
            style={{
              padding: '8px 16px',
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 150,
              margin: 0,
            }}
          >
            {JSON.stringify(cumulativeContext, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
