import type { ValidationError } from '@ruminaider/flowprint-schema'

interface ValidationBannerProps {
  errors: ValidationError[]
  onDismiss: () => void
}

const MAX_DISPLAYED_ERRORS = 5

export function ValidationBanner({ errors, onDismiss }: ValidationBannerProps) {
  const displayed = errors.slice(0, MAX_DISPLAYED_ERRORS)
  const remaining = errors.length - displayed.length

  return (
    <div
      className="fp-validation-banner"
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: 6,
        padding: '8px 16px',
        maxWidth: 480,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontSize: 13,
        color: '#991b1b',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <strong>
          {errors.length} validation error{errors.length !== 1 ? 's' : ''}
        </strong>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#991b1b',
            fontWeight: 600,
            fontSize: 12,
            padding: '2px 6px',
          }}
        >
          Dismiss
        </button>
      </div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {displayed.map((err, i) => (
          <li key={i} className="fp-validation-error" style={{ marginBottom: 2 }}>
            <code style={{ fontSize: 11 }}>{err.path}</code>: {err.message}
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div style={{ marginTop: 4, fontSize: 11, fontStyle: 'italic' }}>
          ...and {remaining} more
        </div>
      )}
    </div>
  )
}
