import { useState, useEffect, useRef, useCallback } from 'react'
import { SUPPORTED_VERSIONS } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export interface NewBlueprintWizardProps {
  open: boolean
  onClose: () => void
  onCreate: (doc: FlowprintDocument) => void
}

interface LaneEntry {
  id: string
  label: string
  visibility: 'external' | 'internal'
}

const DEFAULT_LANE: LaneEntry = {
  id: 'customer',
  label: 'Customer',
  visibility: 'external',
}

function createDefaultLane(): LaneEntry {
  return { ...DEFAULT_LANE }
}

const NAME_PATTERN = /^\S+$/

/** Inner form that resets state naturally when unmounted/remounted. */
function WizardForm({
  dialogRef,
  onCreate,
  onCancel,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>
  onCreate: (doc: FlowprintDocument) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schemaVersion, setSchemaVersion] = useState<string>(SUPPORTED_VERSIONS[0])
  const [lanes, setLanes] = useState<LaneEntry[]>([createDefaultLane()])
  const [nameError, setNameError] = useState<string | null>(null)

  // Show modal when this form mounts (dialog is open)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      dialog?.close()
    }
  }, [dialogRef])

  const handleAddLane = useCallback(() => {
    setLanes((prev) => [...prev, { id: '', label: '', visibility: 'internal' as const }])
  }, [])

  const handleRemoveLane = useCallback((index: number) => {
    setLanes((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleLaneChange = useCallback((index: number, field: keyof LaneEntry, value: string) => {
    setLanes((prev) =>
      prev.map((lane, i) => {
        if (i !== index) return lane
        return { ...lane, [field]: value }
      }),
    )
  }, [])

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Blueprint name is required')
      return
    }
    if (!NAME_PATTERN.test(trimmedName)) {
      setNameError('Name must not contain spaces (use kebab-case)')
      return
    }
    setNameError(null)

    const lanesRecord: Record<
      string,
      { label: string; visibility: 'external' | 'internal'; order: number }
    > = Object.fromEntries(
      lanes.map((l, i) => [
        l.id || `lane-${String(i)}`,
        {
          label: l.label || l.id || `Lane ${String(i)}`,
          visibility: l.visibility,
          order: i,
        },
      ]),
    )

    const firstLaneId = lanes[0]?.id || 'lane-0'

    const doc: FlowprintDocument = {
      schema: schemaVersion,
      name: trimmedName,
      version: '0.1.0',
      description: description.trim() || undefined,
      lanes: lanesRecord,
      nodes: {
        start: {
          type: 'terminal',
          lane: firstLaneId,
          label: 'Start',
          outcome: 'success',
        },
      },
    }

    onCreate(doc)
  }, [name, description, schemaVersion, lanes, onCreate])

  return (
    <>
      <h2>New Blueprint</h2>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fp-wizard-name">Blueprint name</label>
        <br />
        <input
          id="fp-wizard-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameError(null)
          }}
          placeholder="my-service-flow"
          style={{ width: '100%' }}
        />
        {nameError ? (
          <div role="alert" style={{ color: 'red', fontSize: 12, marginTop: 4 }}>
            {nameError}
          </div>
        ) : null}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fp-wizard-description">Description</label>
        <br />
        <textarea
          id="fp-wizard-description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
          }}
          rows={3}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="fp-wizard-version">Schema version</label>
        <br />
        <select
          id="fp-wizard-version"
          value={schemaVersion}
          onChange={(e) => {
            setSchemaVersion(e.target.value)
          }}
        >
          {SUPPORTED_VERSIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <fieldset style={{ marginBottom: 12 }}>
        <legend>Lanes</legend>
        {lanes.map((lane, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <input
              type="text"
              value={lane.id}
              onChange={(e) => {
                handleLaneChange(index, 'id', e.target.value)
              }}
              placeholder="Lane ID"
              aria-label={`Lane ${String(index + 1)} ID`}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              value={lane.label}
              onChange={(e) => {
                handleLaneChange(index, 'label', e.target.value)
              }}
              placeholder="Label"
              aria-label={`Lane ${String(index + 1)} label`}
              style={{ flex: 1 }}
            />
            <label>
              <input
                type="radio"
                name={`lane-vis-${String(index)}`}
                value="external"
                checked={lane.visibility === 'external'}
                onChange={() => {
                  handleLaneChange(index, 'visibility', 'external')
                }}
              />{' '}
              External
            </label>
            <label>
              <input
                type="radio"
                name={`lane-vis-${String(index)}`}
                value="internal"
                checked={lane.visibility === 'internal'}
                onChange={() => {
                  handleLaneChange(index, 'visibility', 'internal')
                }}
              />{' '}
              Internal
            </label>
            <button
              type="button"
              onClick={() => {
                handleRemoveLane(index)
              }}
              disabled={lanes.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={handleAddLane}>
          Add Lane
        </button>
      </fieldset>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" onClick={handleCreate}>
          Create
        </button>
      </div>
    </>
  )
}

export function NewBlueprintWizard({ open, onClose, onCreate }: NewBlueprintWizardProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <dialog ref={dialogRef} onCancel={onClose}>
      {open && <WizardForm dialogRef={dialogRef} onCreate={onCreate} onCancel={onClose} />}
    </dialog>
  )
}
