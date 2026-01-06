export interface DeleteConfirmationProps {
  nodeId: string
  connectionCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmation({
  nodeId,
  connectionCount,
  onConfirm,
  onCancel,
}: DeleteConfirmationProps) {
  return (
    <div className="fp-delete-confirm">
      <p>
        Delete node &apos;{nodeId}&apos;? It has {connectionCount} connections.
      </p>
      <button type="button" onClick={onConfirm}>
        Confirm
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
