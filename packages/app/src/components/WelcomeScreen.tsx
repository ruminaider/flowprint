import type { RecentFile } from '../hooks/useRecentFiles'

export interface WelcomeScreenProps {
  recentFiles: RecentFile[]
  onOpenFile: () => void
  onOpenProject?: () => void
  supportsOpenProject?: boolean
  onNewBlueprint: () => void
  onOpenRecent: (file: RecentFile) => void
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${String(minutes)} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${String(hours)} hour${hours === 1 ? '' : 's'} ago`
  return `${String(days)} day${days === 1 ? '' : 's'} ago`
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 24px',
  fontSize: 14,
  border: '1px solid var(--fp-border, #e0e0e0)',
  borderRadius: 6,
  background: 'var(--fp-primary, #89b4fa)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
}

export function WelcomeScreen({
  recentFiles,
  onOpenFile,
  onOpenProject,
  supportsOpenProject,
  onNewBlueprint,
  onOpenRecent,
}: WelcomeScreenProps) {
  const sorted = [...recentFiles].sort((a, b) => b.lastOpened - a.lastOpened)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        color: 'var(--fp-text, #1e1e2e)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 32 }}>Flowprint</h1>
      <p style={{ margin: '8px 0 32px', color: 'var(--fp-muted, #999)' }}>
        Visual service blueprint editor
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <button type="button" onClick={onOpenFile} style={buttonStyle}>
          Open File
        </button>
        {supportsOpenProject && onOpenProject && (
          <button type="button" onClick={onOpenProject} style={buttonStyle}>
            Open Project
          </button>
        )}
        <button type="button" onClick={onNewBlueprint} style={buttonStyle}>
          New Blueprint
        </button>
      </div>

      <div style={{ width: 360 }}>
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: 14,
            color: 'var(--fp-muted, #999)',
            fontWeight: 600,
          }}
        >
          Recent Files
        </h3>
        {sorted.length === 0 ? (
          <p style={{ color: 'var(--fp-muted, #999)', fontSize: 13 }}>No recent files</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sorted.map((file) => (
              <li key={file.name}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenRecent(file)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--fp-border, #e0e0e0)',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fp-muted, #999)', marginTop: 2 }}>
                    {formatRelativeTime(file.lastOpened)}
                    {file.path ? ` \u2014 ${file.path}` : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
