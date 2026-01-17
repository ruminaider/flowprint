import { useMemo, useState, useEffect, Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { serialize } from '@ruminaider/flowprint-schema'

/**
 * Props for {@link YamlPreviewPanel}.
 */
export interface YamlPreviewPanelProps {
  /** The document to preview as YAML. Serialized using `serialize()` from the schema package. */
  doc: FlowprintDocument
  /** Whether the panel is visible. When `false`, the component renders nothing. */
  visible: boolean
}

// Hide the module specifier from Vite's static analysis so the optional
// dependency does not cause a build/test error when it is not installed.
const MONACO_MODULE = ['@monaco-editor', 'react'].join('/')

interface MonacoEditorProps {
  value: string
  language: string
  options: Record<string, unknown>
  theme: string
}

// Try to lazy-load Monaco - will fail gracefully if not installed
const MonacoEditor = lazy(async () => {
  try {
    const mod = (await import(/* @vite-ignore */ MONACO_MODULE)) as {
      default: ComponentType<MonacoEditorProps>
    }
    return { default: mod.default }
  } catch {
    // Return a component that renders null — will never actually be used
    // because monacoAvailable gates rendering, but satisfies React.lazy
    return { default: (() => null) as unknown as ComponentType<MonacoEditorProps> }
  }
})

/**
 * Panel that displays the current document as canonical `.flowprint.yaml`.
 *
 * Uses progressive enhancement: if `@monaco-editor/react` is installed, renders the
 * YAML with syntax highlighting. Otherwise, falls back to a plain `<pre>` element.
 *
 * Serialization is performed by `serialize()` from `@ruminaider/flowprint-schema`,
 * ensuring deterministic key ordering.
 *
 * @example
 * ```tsx
 * <YamlPreviewPanel doc={doc} visible={showPreview} />
 * ```
 */
export function YamlPreviewPanel({ doc, visible }: YamlPreviewPanelProps) {
  const yaml = useMemo(() => serialize(doc), [doc])
  const [monacoAvailable, setMonacoAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    import(/* @vite-ignore */ MONACO_MODULE)
      .then(() => {
        setMonacoAvailable(true)
      })
      .catch(() => {
        setMonacoAvailable(false)
      })
  }, [])

  if (!visible) return null

  return (
    <div className="fp-yaml-preview">
      <div className="fp-yaml-preview-header">YAML Preview</div>
      <div className="fp-yaml-preview-content">
        {monacoAvailable === null && (
          <div className="fp-yaml-preview-loading">Loading...</div>
        )}
        {monacoAvailable === false && (
          <pre className="fp-yaml-preview-fallback">{yaml}</pre>
        )}
        {monacoAvailable === true && (
          <Suspense
            fallback={
              <div className="fp-yaml-preview-loading">Loading editor...</div>
            }
          >
            <MonacoEditor
              value={yaml}
              language="yaml"
              options={{ readOnly: true, minimap: { enabled: false } }}
              theme="vs-dark"
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
