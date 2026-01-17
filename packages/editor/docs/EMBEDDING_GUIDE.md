# Flowprint Editor Embedding Guide

Embed the Flowprint visual service blueprint editor into your React application.

## Installation

```sh
npm install @ruminaider/flowprint-editor @ruminaider/flowprint-schema
# Optional: for symbol search (browser-side code indexing)
npm install web-tree-sitter
# Optional: for YAML preview with syntax highlighting
npm install @monaco-editor/react
```

## Basic Usage

`FlowprintEditor` is a controlled React component. You provide the document and a change handler:

```tsx
import { useState } from 'react'
import { FlowprintEditor } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function App() {
  const [doc, setDoc] = useState<FlowprintDocument>(initialDoc)
  return <FlowprintEditor value={doc} onChange={setDoc} />
}
```

The editor must be placed inside a container with explicit dimensions (width and height). It fills 100% of its parent.

## Props API Reference

| Prop               | Type                               | Default     | Description                                        |
| ------------------ | ---------------------------------- | ----------- | -------------------------------------------------- |
| `value`            | `FlowprintDocument`                | _required_  | The document to edit                               |
| `onChange`         | `(doc: FlowprintDocument) => void` | _required_  | Callback fired on every document mutation          |
| `className`        | `string`                           | `undefined` | Additional CSS class on the editor root element    |
| `style`            | `React.CSSProperties`              | `undefined` | Inline styles for the editor container             |
| `showMinimap`      | `boolean`                          | `true`      | Show the navigation minimap                        |
| `showGrid`         | `boolean`                          | `true`      | Show background grid dots                          |
| `readOnly`         | `boolean`                          | `false`     | Disable all editing (palette, panels, connections) |
| `theme`            | `'light' \| 'dark' \| 'system'`    | `'system'`  | Color theme mode                                   |
| `symbolSearch`     | `SymbolSearchProvider`             | `undefined` | Symbol search provider for entry point lookup      |
| `showYamlPreview`  | `boolean`                          | `false`     | Show the YAML preview panel                        |
| `showExportButton` | `boolean`                          | `false`     | Show the SVG export button                         |

## Theming

### Built-in Themes

The editor ships with two built-in themes:

- **light** -- clean light palette with neutral grays
- **dark** -- [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) palette with warm dark tones

### System Theme Detection

When `theme="system"` (the default), the editor listens to the `prefers-color-scheme` media query and switches automatically between light and dark.

### How Theming Works

The editor root element receives a `data-fp-theme` attribute set to the resolved theme (`"light"` or `"dark"`). Dark-mode CSS custom properties are scoped to `[data-fp-theme='dark']`.

```tsx
<FlowprintEditor value={doc} onChange={setDoc} theme="dark" />
```

### CSS Custom Properties Reference

All design tokens use the `--fp-*` prefix. Override them on a parent element or on `.fp-editor` to customize the look.

#### Canvas

| Variable           | Light     | Dark      | Description       |
| ------------------ | --------- | --------- | ----------------- |
| `--fp-bg-canvas`   | `#f8fafc` | `#1e1e2e` | Canvas background |
| `--fp-bg-grid-dot` | `#94a3b8` | `#585b70` | Grid dot color    |

#### Node Base

| Variable              | Light             | Dark              | Description             |
| --------------------- | ----------------- | ----------------- | ----------------------- |
| `--fp-node-bg`        | `#ffffff`         | `#313244`         | Default node background |
| `--fp-node-border`    | `#d1d5db`         | `#45475a`         | Default node border     |
| `--fp-node-shadow`    | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.3)` | Node box shadow         |
| `--fp-text-primary`   | `#1f2937`         | `#cdd6f4`         | Primary text            |
| `--fp-text-secondary` | `#6b7280`         | `#a6adc8`         | Secondary text          |

#### Node Types

| Variable                            | Light     | Dark      | Description                   |
| ----------------------------------- | --------- | --------- | ----------------------------- |
| `--fp-node-switch-bg`               | `#fffbeb` | `#2a2520` | Switch node background        |
| `--fp-node-switch-border`           | `#f59e0b` | `#f9e2af` | Switch node border            |
| `--fp-node-parallel-bg`             | `#f0fdf4` | `#1e2e24` | Parallel node background      |
| `--fp-node-parallel-border`         | `#22c55e` | `#a6e3a1` | Parallel node border          |
| `--fp-node-wait-bg`                 | `#fefce8` | `#2a2420` | Wait node background          |
| `--fp-node-wait-border`             | `#eab308` | `#fab387` | Wait node border              |
| `--fp-node-error-bg`                | `#fef2f2` | `#2e1e24` | Error node background         |
| `--fp-node-error-border`            | `#ef4444` | `#f38ba8` | Error node border             |
| `--fp-node-terminal-success-bg`     | `#dcfce7` | `#1e2e24` | Terminal (success) background |
| `--fp-node-terminal-success-border` | `#22c55e` | `#a6e3a1` | Terminal (success) border     |
| `--fp-node-terminal-failure-bg`     | `#fef2f2` | `#2e1e24` | Terminal (failure) background |
| `--fp-node-terminal-failure-border` | `#ef4444` | `#f38ba8` | Terminal (failure) border     |

#### Selection

| Variable              | Light     | Dark      | Description        |
| --------------------- | --------- | --------- | ------------------ |
| `--fp-selection-ring` | `#3b82f6` | `#89b4fa` | Selected node ring |

#### Edges

| Variable            | Light     | Dark      | Description                   |
| ------------------- | --------- | --------- | ----------------------------- |
| `--fp-edge-normal`  | `#6b7280` | `#7f849c` | Normal edge color             |
| `--fp-edge-error`   | `#ef4444` | `#f38ba8` | Error edge color              |
| `--fp-edge-default` | `#9ca3af` | `#6c7086` | Default (fallback) edge color |

#### Panels

| Variable               | Light     | Dark      | Description             |
| ---------------------- | --------- | --------- | ----------------------- |
| `--fp-panel-bg`        | `#ffffff` | `#181825` | Panel background        |
| `--fp-panel-border`    | `#e5e7eb` | `#45475a` | Panel border            |
| `--fp-panel-header-bg` | `#f9fafb` | `#313244` | Panel header background |

#### Badges and Buttons

| Variable                 | Light     | Dark      | Description                   |
| ------------------------ | --------- | --------- | ----------------------------- |
| `--fp-badge-entry`       | `#3b82f6` | `#89b4fa` | Entry point badge color       |
| `--fp-btn-primary`       | `#3b82f6` | `#89b4fa` | Primary button color          |
| `--fp-btn-danger`        | `#ef4444` | `#f38ba8` | Danger button color           |
| `--fp-unassigned-border` | `#f59e0b` | `#f9e2af` | Unassigned node dashed border |

#### Validation Banner

| Variable             | Light     | Dark      | Description       |
| -------------------- | --------- | --------- | ----------------- |
| `--fp-banner-bg`     | `#fef2f2` | `#2e1e24` | Banner background |
| `--fp-banner-border` | `#fca5a5` | `#eba0ac` | Banner border     |
| `--fp-banner-text`   | `#991b1b` | `#f38ba8` | Banner text       |

#### Additional Colors

| Variable            | Light              | Dark              | Description      |
| ------------------- | ------------------ | ----------------- | ---------------- |
| `--fp-bg-hover`     | `#f3f4f6`          | `#313244`         | Hover background |
| `--fp-border-light` | `#f3f4f6`          | `#45475a`         | Light border     |
| `--fp-text-dark`    | `#374151`          | `#bac2de`         | Dark text        |
| `--fp-text-muted`   | `#9ca3af`          | `#7f849c`         | Muted text       |
| `--fp-text-error`   | `#dc2626`          | `#f38ba8`         | Error text       |
| `--fp-text-success` | `#166534`          | `#a6e3a1`         | Success text     |
| `--fp-text-warning` | `#92400e`          | `#fab387`         | Warning text     |
| `--fp-shadow-heavy` | `rgba(0,0,0,0.15)` | `rgba(0,0,0,0.4)` | Heavy shadow     |

#### Entry Point Picker

| Variable                   | Light     | Dark      | Description                  |
| -------------------------- | --------- | --------- | ---------------------------- |
| `--fp-picker-result-hover` | `#f3f4f6` | `#313244` | Search result hover          |
| `--fp-picker-kind-bg`      | `#e5e7eb` | `#45475a` | Symbol kind badge background |
| `--fp-picker-kind-text`    | `#374151` | `#cdd6f4` | Symbol kind badge text       |

### Custom Theme Example

Override CSS custom properties on a wrapper to create a brand theme:

```css
.my-brand-editor .fp-editor {
  --fp-btn-primary: #7c3aed;
  --fp-badge-entry: #7c3aed;
  --fp-selection-ring: #7c3aed;
  --fp-node-bg: #faf5ff;
  --fp-node-border: #c4b5fd;
}
```

```tsx
<div className="my-brand-editor" style={{ width: '100%', height: '600px' }}>
  <FlowprintEditor value={doc} onChange={setDoc} />
</div>
```

## Symbol Search

Symbol search enables entry point lookup by searching code symbols (functions, classes, methods) and linking them to action nodes.

### SymbolSearchProvider Interface

```ts
interface SymbolSearchProvider {
  search(query: string): Promise<SymbolResult[]>
  resolve(file: string, symbol: string): Promise<SymbolDetail | null>
  readonly name: string
  readonly ready: boolean
}
```

### Built-in Providers

#### TreeSitterIndex

Parses source files in-browser using WASM-based tree-sitter grammars. Supports TypeScript, JavaScript, and Python out of the box.

```ts
import { TreeSitterIndex } from '@ruminaider/flowprint-editor'

const index = new TreeSitterIndex({ wasmPath: '/tree-sitter/' })
await index.init([
  { path: 'src/api.ts', content: '...' },
  { path: 'src/utils.ts', content: '...' },
])
// index.ready === true
```

Requires `web-tree-sitter` as an optional peer dependency and WASM grammar files served from `wasmPath`.

#### CodeSearchProvider

Connects to a running [code-search](https://github.com/ruminaider/code-search) server via REST API.

```ts
import { CodeSearchProvider } from '@ruminaider/flowprint-editor'

const provider = new CodeSearchProvider({
  url: 'http://localhost:8080',
  apiKey: 'optional-key',
})
await provider.checkHealth() // probes /health endpoint
// provider.ready === true if server responded OK
```

### useSymbolSearch Hook

Auto-detects the best available provider. Tries `CodeSearchProvider` first (semantic search), then falls back to `TreeSitterIndex`.

```tsx
import { FlowprintEditor, useSymbolSearch } from '@ruminaider/flowprint-editor'

function App() {
  const [doc, setDoc] = useState<FlowprintDocument>(initialDoc)
  const { provider, loading } = useSymbolSearch({
    codeSearchUrl: 'http://localhost:8080',
  })

  return <FlowprintEditor value={doc} onChange={setDoc} symbolSearch={provider ?? undefined} />
}
```

#### Options

| Option             | Type                                  | Description                         |
| ------------------ | ------------------------------------- | ----------------------------------- |
| `codeSearchUrl`    | `string`                              | URL to probe for code-search server |
| `codeSearchApiKey` | `string`                              | API key for authentication          |
| `files`            | `{ path: string; content: string }[]` | Files to index with tree-sitter     |
| `wasmPath`         | `string`                              | Base URL for tree-sitter WASM files |

#### Return Value

| Field          | Type                           | Description                           |
| -------------- | ------------------------------ | ------------------------------------- |
| `provider`     | `SymbolSearchProvider \| null` | The active provider, or null          |
| `providerName` | `string \| null`               | Name of the active provider           |
| `loading`      | `boolean`                      | Whether initialization is in progress |
| `reconnect`    | `() => Promise<void>`          | Re-probe the code-search server       |

### Custom Provider Example

Implement `SymbolSearchProvider` to integrate any code search backend:

```ts
import type { SymbolSearchProvider, SymbolResult, SymbolDetail } from '@ruminaider/flowprint-editor'

class MySearchProvider implements SymbolSearchProvider {
  readonly name = 'my-search'
  readonly ready = true

  async search(query: string): Promise<SymbolResult[]> {
    const response = await fetch(`/api/symbols?q=${encodeURIComponent(query)}`)
    return response.json()
  }

  async resolve(file: string, symbol: string): Promise<SymbolDetail | null> {
    const response = await fetch(`/api/symbols/resolve?file=${file}&symbol=${symbol}`)
    if (!response.ok) return null
    return response.json()
  }
}
```

## YAML Preview

The YAML preview panel renders the current document as canonical `.flowprint.yaml` using the schema package's `serialize()` function.

### Enabling Monaco Syntax Highlighting

Install `@monaco-editor/react` as an optional dependency:

```sh
npm install @monaco-editor/react
```

The editor detects Monaco at runtime. If installed, it renders the YAML preview with syntax highlighting. If not installed, it falls back to a plain `<pre>` element.

### Usage

```tsx
<FlowprintEditor value={doc} onChange={setDoc} showYamlPreview />
```

## SVG Export

The export button clones the React Flow viewport DOM and serializes it to an SVG file, which is downloaded as `{documentName}.svg`.

### Usage

```tsx
<FlowprintEditor value={doc} onChange={setDoc} showExportButton />
```

The export button is hidden in read-only mode.

## CSS Customization

### Class Prefix

All CSS classes use the `fp-` prefix to avoid collisions:

- `.fp-editor` -- editor root
- `.fp-viewer` -- read-only viewer root
- `.fp-node` -- base node class
- `.fp-node-action`, `.fp-node-switch`, etc. -- node type classes
- `.fp-panel` -- properties panel
- `.fp-palette` -- node palette
- `.fp-lane-panel` -- lane manager panel
- `.fp-yaml-preview` -- YAML preview panel
- `.fp-export-btn` -- export button

### Overriding Styles

Override `--fp-*` variables on your container to customize colors without touching internal selectors:

```css
.my-app .fp-editor {
  --fp-btn-primary: #059669;
  --fp-badge-entry: #059669;
  --fp-selection-ring: #059669;
}
```

## Code Examples

### 1. Basic Editor Setup

```tsx
import { useState } from 'react'
import { FlowprintEditor } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

const initialDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'my-service',
  version: '0.1.0',
  lanes: {
    frontend: { label: 'Frontend', visibility: 'external', order: 0 },
    backend: { label: 'Backend', visibility: 'internal', order: 1 },
  },
  nodes: {
    start: {
      type: 'action',
      lane: 'frontend',
      label: 'User Request',
      next: 'process',
    },
    process: {
      type: 'action',
      lane: 'backend',
      label: 'Process Request',
      next: 'done',
    },
    done: {
      type: 'terminal',
      lane: 'backend',
      label: 'Complete',
      outcome: 'success',
    },
  },
}

function App() {
  const [doc, setDoc] = useState<FlowprintDocument>(initialDoc)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FlowprintEditor value={doc} onChange={setDoc} />
    </div>
  )
}
```

### 2. Dark Theme with Symbol Search

```tsx
import { useState } from 'react'
import { FlowprintEditor, useSymbolSearch } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function DarkEditor({ initialDoc }: { initialDoc: FlowprintDocument }) {
  const [doc, setDoc] = useState(initialDoc)
  const { provider } = useSymbolSearch({
    codeSearchUrl: 'http://localhost:8080',
  })

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FlowprintEditor
        value={doc}
        onChange={setDoc}
        theme="dark"
        symbolSearch={provider ?? undefined}
        showExportButton
      />
    </div>
  )
}
```

### 3. Read-Only Viewer with YAML Preview

```tsx
import { FlowprintEditor } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function BlueprintViewer({ doc }: { doc: FlowprintDocument }) {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <FlowprintEditor
        value={doc}
        onChange={() => {}}
        readOnly
        showYamlPreview
        showMinimap
        showGrid={false}
      />
    </div>
  )
}
```

Alternatively, use `FlowprintViewer` for a lighter read-only component without any editing infrastructure:

```tsx
import { FlowprintViewer } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'

function BlueprintViewer({ doc }: { doc: FlowprintDocument }) {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <FlowprintViewer document={doc} />
    </div>
  )
}
```
