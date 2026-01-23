# Flowprint

Visual service blueprint editor that produces `.flowprint.yaml` files — machine-readable descriptions of service flows with swimlanes, decision points, parallel branches, and code entry points.

## What it does

Flowprint lets you model service architectures as directed graphs of typed nodes (actions, switches, parallel branches, waits, error handlers, terminals) organized into swimlanes representing different actors or tiers. Each node can reference the code that implements it via entry points (file + symbol), bridging the gap between architecture diagrams and source code.

```yaml
schema: flowprint/1.0
name: consultation-flow
version: '1.0.0'
description: Patient consultation flow

lanes:
  patient:
    label: Patient
    visibility: external
    order: 0
  backend:
    label: Backend Services
    visibility: internal
    order: 1

nodes:
  submit_request:
    type: action
    lane: patient
    label: Submit Request
    entry_points:
      - file: src/api/consults.ts
        symbol: createConsultation
    next: process_request

  process_request:
    type: action
    lane: backend
    label: Process Request
    next: complete

  complete:
    type: terminal
    lane: backend
    label: Done
    outcome: success
```

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@ruminaider/flowprint-schema`](packages/schema) | JSON Schema, TypeScript types, validation, graph utilities, and canonical serializer | `npm install @ruminaider/flowprint-schema` |
| [`@ruminaider/flowprint-editor`](packages/editor) | Embeddable React component for visual blueprint editing with theming and symbol search | `npm install @ruminaider/flowprint-editor` |
| [`flowprint`](packages/cli) | CLI for validating, linting, diffing, migrating, and scaffolding blueprints | `npm install -g flowprint` |
| [`flowprint-app`](packages/app) | Standalone web application with file I/O, settings persistence, and deployment support | (private) |

## Quick start

### CLI

```bash
npm install -g flowprint

# Scaffold a new blueprint
flowprint init my-service

# Validate a blueprint
flowprint validate my-service.flowprint.yaml

# Lint for best practices
flowprint lint my-service.flowprint.yaml

# Diff two versions
flowprint diff v1.flowprint.yaml v2.flowprint.yaml
```

### Embed the editor

```bash
npm install @ruminaider/flowprint-editor @ruminaider/flowprint-schema
```

```tsx
import { useState } from 'react'
import { FlowprintEditor } from '@ruminaider/flowprint-editor'
import '@ruminaider/flowprint-editor/styles.css'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

function App() {
  const [doc, setDoc] = useState<FlowprintDocument>(initialDoc)

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <FlowprintEditor value={doc} onChange={setDoc} />
    </div>
  )
}
```

### Run the standalone app

```bash
git clone https://github.com/ruminaider/flowprint.git
cd flowprint
pnpm install
pnpm build
pnpm --filter flowprint-app dev
```

Open http://localhost:5173.

## Node types

| Type | Purpose |
|------|---------|
| `action` | Performs work and transitions to the next node |
| `switch` | Routes based on conditions (like a switch statement) |
| `parallel` | Fans out to multiple branches, joins at a single node |
| `wait` | Pauses until an event occurs or a timeout expires |
| `error` | Handles errors from upstream action nodes |
| `terminal` | End state of the flow (`success` or `failure`) |

## Features

**Schema package**
- JSON Schema validation with structural analysis (dangling refs, cycles, orphan nodes)
- Canonical YAML serializer with deterministic key ordering
- Graph utilities: topological sort, cycle detection, edge extraction, root finding
- Type guards for all node types

**Editor**
- Drag-and-drop node placement with automatic layout
- Swimlane management with reordering
- Properties panel for editing node metadata and entry points
- Dark/light/system theme (dark uses Catppuccin Mocha)
- Optional symbol search via tree-sitter WASM or remote code-search server
- YAML preview panel with live output
- SVG export
- Undo/redo with full history
- Keyboard shortcuts (delete, undo, redo, select all)

**CLI**
- `validate` — schema + structural validation with colored output
- `lint` — best practice checks (naming, lane ordering, empty branches)
- `diff` — structured diff between blueprint versions
- `migrate` — upgrade blueprints between schema versions
- `init` — scaffold new blueprints interactively

**Standalone app**
- File System Access API (Chrome/Edge) with `<input type="file">` fallback (Firefox/Safari)
- Recent files list persisted in IndexedDB
- Settings persistence (theme, code-search URL, repo root)
- New blueprint wizard
- Unsaved changes warning
- Docker deployment with nginx

## Development

Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm build        # Build all packages (respects dependency order via Turborepo)
pnpm test         # Unit tests (584 tests across all packages)
pnpm test:e2e     # Playwright E2E tests
pnpm lint         # ESLint
pnpm typecheck    # TypeScript type checking
pnpm format       # Prettier
```

### Architecture

```
packages/
  schema/    @ruminaider/flowprint-schema    Zero-dep validation + serialization
  editor/    @ruminaider/flowprint-editor    React component (depends on schema)
  cli/       flowprint                       Node.js CLI (depends on schema)
  app/       flowprint-app                   Vite SPA (depends on editor + schema)
```

Build order: `schema` -> `editor` + `cli` (parallel) -> `app`

## Documentation

- [Getting Started](docs/getting-started.md) — full walkthrough from install to CI validation
- [YAML Format Reference](docs/yaml-format-reference.md) — complete schema documentation
- [CLI Reference](docs/cli-reference.md) — all commands, options, and exit codes
- [Deployment Guide](docs/deployment.md) — Docker, Vercel, Cloudflare Pages, AWS, GCP
- [Embedding Guide](packages/editor/docs/EMBEDDING_GUIDE.md) — editor component API, theming, symbol search

## License

MIT
