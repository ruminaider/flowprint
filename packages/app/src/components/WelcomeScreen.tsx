import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { RecentFile } from '../hooks/useRecentFiles'
import { getTemplates, getTemplateTopo, loadTemplate } from '../data/templates'
import type { TemplateComplexity } from '../data/templates'
import { TopologyPreview } from './TopologyPreview'

export interface WelcomeScreenProps {
  recentFiles: RecentFile[]
  onOpenFile: () => void
  onOpenProject?: () => void
  supportsOpenProject?: boolean
  onNewBlueprint: () => void
  onOpenRecent: (file: RecentFile) => void
  onLoadTemplate: (doc: FlowprintDocument) => void
  isDark: boolean
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

// ── Complexity colors ───────────────────────────

const COMPLEXITY_COLORS: Record<TemplateComplexity, string> = {
  beginner: '#10B981',
  intermediate: '#3B82F6',
  advanced: '#F59E0B',
  showcase: '#A374FF',
}

const COMPLEXITY_LABELS: Record<TemplateComplexity, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  showcase: 'Showcase',
}

// ── Shared styles ───────────────────────────────

const pageStyle: React.CSSProperties = {
  overflowY: 'auto',
  height: '100%',
  width: '100%',
  background: 'var(--fp-bg-canvas, #0A0A0F)',
  color: 'var(--fp-text-primary, #E8E7F4)',
  fontFamily: 'var(--fp-font-sans, Inter, system-ui, sans-serif)',
  position: 'relative',
}

const mainStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 10,
  maxWidth: 1100,
  margin: '0 auto',
  padding: '64px 24px',
}

const heroStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 20,
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  padding: 48,
  marginBottom: 80,
  overflow: 'hidden',
  background: 'var(--fp-bg-elevated, #13121E)',
}

const heroInnerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 48,
  position: 'relative',
  zIndex: 1,
}

const heroContentStyle: React.CSSProperties = { flex: 1 }

const heroBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 14px',
  borderRadius: 100,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  border: '1px solid var(--fp-color-primary-subtle, #A374FF20)',
  background: 'var(--fp-color-primary-subtle, #A374FF15)',
  color: 'var(--fp-color-primary, #A374FF)',
  marginBottom: 24,
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 900,
  letterSpacing: '-0.04em',
  lineHeight: 0.95,
  marginBottom: 24,
  margin: 0,
}

const heroSubtitleStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: 'var(--fp-text-secondary, #8887A5)',
  maxWidth: 480,
  marginBottom: 32,
  marginTop: 24,
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 28px',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 800,
  color: '#fff',
  background: 'var(--fp-color-primary, #A374FF)',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const btnSecondaryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 28px',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--fp-text-primary, #E8E7F4)',
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-surface, #1C1B25)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const heroVisualStyle: React.CSSProperties = {
  width: 340,
  height: 280,
  borderRadius: 16,
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-canvas, #0A0A0F)',
  overflow: 'hidden',
  position: 'relative',
  flexShrink: 0,
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 32,
}

const sectionIconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-surface, #1C1B25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--fp-color-primary, #A374FF)',
  flexShrink: 0,
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--fp-text-primary, #E8E7F4)',
  opacity: 0.35,
  whiteSpace: 'nowrap',
}

const sectionRuleStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--fp-border-default, #2E2D3D)',
}

const templateGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 20,
  marginBottom: 80,
}

const cardStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-surface, rgba(28, 27, 37, 0.4))',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
  transition: 'transform 0.25s, box-shadow 0.35s, border-color 0.25s',
}

const cardGraphicStyle: React.CSSProperties = {
  height: 120,
  position: 'relative',
  overflow: 'hidden',
  borderBottom: '1px solid var(--fp-border-default, #2E2D3D)',
}

const cardBodyStyle: React.CSSProperties = {
  padding: '16px 20px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: 1,
}

const cardTitleRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: '-0.01em',
}

const cardDescStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.6,
  color: 'var(--fp-text-secondary, #8887A5)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}

const cardStatsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginTop: 'auto',
  paddingTop: 12,
  borderTop: '1px dashed var(--fp-border-default, #2E2D3D)',
}

const cardStatStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontFamily: 'var(--fp-font-mono, monospace)',
  fontSize: 11,
  color: 'var(--fp-text-tertiary, #6B6A85)',
}

const recentListStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-surface, rgba(28, 27, 37, 0.4))',
  overflow: 'hidden',
  marginBottom: 80,
}

const recentItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  padding: '20px 24px',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
  borderBottom: '1px solid var(--fp-border-default, rgba(46, 45, 61, 0.5))',
}

const recentIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  flexShrink: 0,
  border: '1px solid var(--fp-border-default, #2E2D3D)',
  background: 'var(--fp-bg-canvas, #0A0A0F)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--fp-text-tertiary, #6B6A85)',
}

const footerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--fp-border-default, #2E2D3D)',
  padding: '16px 24px',
}

const footerInnerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 7px',
  borderRadius: 5,
  fontFamily: 'var(--fp-font-mono, monospace)',
  fontSize: 9,
  fontWeight: 600,
  background: 'var(--fp-bg-surface, #1C1B25)',
  border: '1px solid var(--fp-border-default, #3D3C52)',
  color: 'var(--fp-color-primary, #A374FF)',
  opacity: 0.8,
}

// ── Component ───────────────────────────────────

export function WelcomeScreen({
  recentFiles,
  onOpenFile,
  onNewBlueprint,
  onOpenRecent,
  onLoadTemplate,
  isDark,
}: WelcomeScreenProps) {
  const templates = getTemplates()
  const sorted = [...recentFiles].sort((a, b) => b.lastOpened - a.lastOpened)

  return (
    <div style={pageStyle}>
      {/* Background effects */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--fp-color-primary, #A374FF) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            opacity: 0.04,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 0%, var(--fp-color-primary-subtle, #A374FF15) 0%, transparent 50%)',
          }}
        />
        {isDark && (
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '40%',
              height: '40%',
              background: 'var(--fp-color-primary-subtle, #A374FF15)',
              filter: 'blur(120px)',
              borderRadius: '50%',
            }}
          />
        )}
      </div>

      <main style={mainStyle}>
        {/* ── Hero ─────────────────────────────── */}
        <div style={heroStyle}>
          {/* Glow accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 140,
              height: 140,
              background: 'var(--fp-color-primary, #A374FF)',
              filter: 'blur(60px)',
              opacity: 0.15,
              transform: 'translate(50%, -50%)',
              pointerEvents: 'none',
            }}
          />

          <div style={heroInnerStyle}>
            <div style={heroContentStyle}>
              <div style={heroBadgeStyle}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
                </svg>
                10 VALIDATED BLUEPRINT PATTERNS
              </div>

              <h1 style={heroTitleStyle}>
                Design workflows
                <br />
                with digital precision.
              </h1>

              <p style={heroSubtitleStyle}>
                Flowprint is the professional standard for technical service blueprints and process
                architecture. Start from scratch or leverage our library of validated patterns.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <button type="button" style={btnPrimaryStyle} onClick={onNewBlueprint}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  NEW BLUEPRINT
                </button>
                <button type="button" style={btnSecondaryStyle} onClick={onOpenFile}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  OPEN YAML
                </button>
              </div>
            </div>

            {/* Hero visual — blueprint schematic */}
            <div style={heroVisualStyle}>
              <HeroBlueprint />
            </div>
          </div>
        </div>

        {/* ── System Blueprints ────────────────── */}
        <section>
          <div style={sectionHeaderStyle}>
            <div style={sectionIconStyle}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="none"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10" />
              </svg>
            </div>
            <span style={sectionLabelStyle}>System Blueprints</span>
            <div style={sectionRuleStyle} />
          </div>

          <div style={templateGridStyle}>
            {templates.map((t) => {
              const color = COMPLEXITY_COLORS[t.complexity]
              const topo = getTemplateTopo(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid="template-card"
                  style={{
                    ...cardStyle,
                    ['--cx' as string]: color,
                  }}
                  onClick={() => {
                    onLoadTemplate(loadTemplate(t.id))
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(-4px)'
                    el.style.borderColor = `${color}40`
                    el.style.boxShadow = `0 0 30px -10px ${color}, 0 10px 40px -20px rgba(0,0,0,0.4)`
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    el.style.transform = ''
                    el.style.borderColor = ''
                    el.style.boxShadow = ''
                  }}
                >
                  {/* Accent line */}
                  <div
                    style={{
                      height: 2,
                      width: '100%',
                      background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
                      opacity: 0.3,
                    }}
                  />

                  {/* Graphic zone */}
                  <div style={cardGraphicStyle}>
                    <TopologyPreview topo={topo} width={320} height={120} isDark={isDark} />
                    {/* Complexity badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        padding: '2px 10px',
                        borderRadius: 6,
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        border: `1px solid ${color}40`,
                        background: `color-mix(in srgb, ${color} 25%, rgba(10,10,15,0.75))`,
                        color,
                        zIndex: 2,
                      }}
                    >
                      {COMPLEXITY_LABELS[t.complexity]}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={cardBodyStyle}>
                    <div style={cardTitleRowStyle}>
                      <span style={cardTitleStyle}>{t.name}</span>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          background: 'var(--fp-bg-surface, #1C1B25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--fp-color-primary, #A374FF)',
                          opacity: 0,
                          transition: 'opacity 0.25s',
                        }}
                        className="card-arrow"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </div>
                    </div>
                    <p style={cardDescStyle}>{t.description}</p>
                    <div style={cardStatsStyle}>
                      <div style={cardStatStyle}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                          <rect x="9" y="9" width="6" height="6" />
                        </svg>
                        <span>{t.nodeCount}n</span>
                      </div>
                      <div style={cardStatStyle}>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                        <span>{t.laneCount}L</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Recent Files ─────────────────────── */}
        {sorted.length > 0 && (
          <section data-testid="recent-files-section">
            <div style={sectionHeaderStyle}>
              <div style={sectionIconStyle}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span style={sectionLabelStyle}>Terminal History</span>
              <div style={sectionRuleStyle} />
            </div>

            <div style={recentListStyle}>
              {sorted.map((file, i) => (
                <button
                  key={file.name}
                  type="button"
                  style={{
                    ...recentItemStyle,
                    borderBottom:
                      i === sorted.length - 1
                        ? 'none'
                        : recentItemStyle.borderBottom,
                  }}
                  onClick={() => {
                    onOpenRecent(file)
                  }}
                >
                  <div style={recentIconStyle}>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {file.name}
                    </div>
                    {file.path && (
                      <div
                        style={{
                          fontFamily: 'var(--fp-font-mono, monospace)',
                          fontSize: 11,
                          color: 'var(--fp-text-tertiary, #6B6A85)',
                          opacity: 0.5,
                          marginTop: 3,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {file.path}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: 'var(--fp-color-primary, #A374FF)',
                        opacity: 0.5,
                      }}
                    >
                      LAST MODIFIED
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--fp-font-mono, monospace)',
                        fontSize: 11,
                        color: 'var(--fp-text-tertiary, #4D4C66)',
                        marginTop: 2,
                      }}
                    >
                      {formatRelativeTime(file.lastOpened)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer style={footerStyle}>
        <div style={footerInnerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: 'var(--fp-text-tertiary, #4D4C66)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
              </svg>
              SHORTCUTS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
              <Shortcut keys={['CMD', 'N']} label="New blueprint" />
              <Shortcut keys={['CMD', 'O']} label="Open YAML" />
              <Shortcut keys={['CMD', 'K']} label="Palette" />
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--fp-font-mono, monospace)',
              fontSize: 10,
              letterSpacing: '0.02em',
              color: 'var(--fp-text-primary, #E8E7F4)',
              opacity: 0.3,
            }}
          >
            FLOWPRINT &middot; 10 TEMPLATES
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Shortcut chip ───────────────────────────────

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {keys.map((k) => (
          <kbd key={k} style={kbdStyle}>
            {k}
          </kbd>
        ))}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: 'var(--fp-text-tertiary, #4D4C66)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Hero blueprint SVG ──────────────────────────

function HeroBlueprint() {
  return (
    <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Background grid */}
      <defs>
        <pattern id="bpGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.6" fill="var(--fp-color-primary, #A374FF)" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="340" height="280" fill="url(#bpGrid)" />

      {/* Lane dividers */}
      <line x1="0" y1="93" x2="340" y2="93" stroke="var(--fp-border-default, #2E2D3D)" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.4" />
      <line x1="0" y1="186" x2="340" y2="186" stroke="var(--fp-border-default, #2E2D3D)" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.4" />

      {/* Lane labels */}
      <text x="12" y="30" fill="var(--fp-text-tertiary, #6B6A85)" opacity="0.5" fontSize="8" fontWeight="600" letterSpacing="0.1em" fontFamily="var(--fp-font-mono, monospace)">CLIENT</text>
      <text x="12" y="120" fill="var(--fp-text-tertiary, #6B6A85)" opacity="0.5" fontSize="8" fontWeight="600" letterSpacing="0.1em" fontFamily="var(--fp-font-mono, monospace)">SERVICE</text>
      <text x="12" y="212" fill="var(--fp-text-tertiary, #6B6A85)" opacity="0.5" fontSize="8" fontWeight="600" letterSpacing="0.1em" fontFamily="var(--fp-font-mono, monospace)">DATABASE</text>

      {/* Edges */}
      <path d="M 90 50 L 150 50" stroke="var(--fp-color-primary, #A374FF)" strokeWidth="1.2" opacity="0.6" />
      <path d="M 220 50 L 250 50 L 250 140" stroke="var(--fp-border-default, #2E2D3D)" strokeWidth="1.2" fill="none" />
      <path d="M 270 140 L 310 140 L 310 235 L 280 235" stroke="var(--fp-border-default, #2E2D3D)" strokeWidth="1.2" fill="none" />
      <path d="M 250 160 L 250 235 L 170 235" stroke="var(--fp-border-default, #2E2D3D)" strokeWidth="1.2" fill="none" />

      {/* Start node pulse */}
      <circle cx="60" cy="50" r="18" fill="none" stroke="var(--fp-color-primary, #A374FF)" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="18;24;18" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Nodes */}
      <rect x="36" y="34" width="48" height="32" rx="6" ry="6" fill="var(--fp-bg-surface, #1C1B25)" stroke="var(--fp-color-primary, #A374FF)" strokeWidth="1.5" />
      <text x="60" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--fp-color-primary, #A374FF)" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">Start</text>

      <rect x="150" y="34" width="70" height="32" rx="6" ry="6" fill="var(--fp-bg-surface, #1C1B25)" stroke="#10B981" strokeWidth="1.5" />
      <text x="185" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--fp-text-secondary, #8887A5)" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">Validate</text>

      <rect x="224" y="114" width="52" height="52" rx="4" ry="4" transform="rotate(45 250 140)" fill="var(--fp-bg-surface, #1C1B25)" stroke="#3B82F6" strokeWidth="1.5" />
      <text x="250" y="140" textAnchor="middle" dominantBaseline="central" fill="#3B82F6" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">Auth?</text>

      <rect x="215" y="219" width="65" height="32" rx="6" ry="6" fill="var(--fp-bg-surface, #1C1B25)" stroke="#10B981" strokeWidth="1.5" />
      <text x="247" y="235" textAnchor="middle" dominantBaseline="central" fill="var(--fp-text-secondary, #8887A5)" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">Process</text>

      <rect x="105" y="219" width="65" height="32" rx="6" ry="6" fill="var(--fp-bg-surface, #1C1B25)" stroke="#EF4444" strokeWidth="1.5" />
      <text x="137" y="235" textAnchor="middle" dominantBaseline="central" fill="#EF4444" fontSize="7.5" fontWeight="600" fontFamily="Inter, sans-serif">Error</text>

      {/* Edge labels */}
      <text x="275" y="185" fill="var(--fp-text-tertiary, #4D4C66)" fontSize="6" fontFamily="var(--fp-font-mono, monospace)">yes</text>
      <text x="237" y="185" fill="var(--fp-text-tertiary, #4D4C66)" fontSize="6" fontFamily="var(--fp-font-mono, monospace)">no</text>
    </svg>
  )
}
