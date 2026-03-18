import { useRef, useEffect } from 'react'
import type { MigrationChangelog } from '@ruminaider/flowprint-schema'

export interface MigrationModalProps {
  open: boolean
  changelog: MigrationChangelog
  forced?: boolean
  onAccept: () => void
}

export function MigrationModal({ open, changelog, forced, onAccept }: MigrationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className="fp-migration-modal">
      <h2 className="fp-migration-modal__title">
        {forced ? 'Upgrade Required' : "What's New"}
      </h2>
      <p className="fp-migration-modal__subtitle">
        Upgrading from {changelog.from} &rarr; {changelog.to}
      </p>
      <ul className="fp-migration-modal__entries">
        {changelog.entries.map((entry, i) => (
          <li key={i} className="fp-migration-modal__entry">
            <strong>{entry.version}</strong>
            <span>{entry.description}</span>
            {entry.transforms.length > 0 && (
              <ul className="fp-migration-modal__transforms">
                {entry.transforms.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="fp-migration-modal__actions">
        <button className="fp-migration-modal__accept" onClick={onAccept}>
          {forced ? 'Upgrade Now' : 'Upgrade & Continue'}
        </button>
      </div>
    </dialog>
  )
}
