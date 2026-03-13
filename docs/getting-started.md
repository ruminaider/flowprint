# Getting Started with Flowprint

Flowprint is a visual service blueprint editor that produces `.flowprint.yaml` files. This guide walks you through installing the CLI, creating your first blueprint, editing it in the standalone app, and validating the result.

## Prerequisites

- **Node.js 22+** (check with `node --version`)
- **pnpm** (recommended) or npm

## 1. Install the CLI

```bash
npm install -g flowprint
# or
pnpm add -g flowprint
```

Verify the installation:

```bash
flowprint --version
```

Expected output:

```
0.0.0
```

## 2. Initialize a Blueprint

```bash
flowprint init my-service
```

This creates `my-service.flowprint.yaml` in the current directory with a default structure:

```yaml
schema: flowprint/1.0
name: my-service
version: 1.0.0
description: my-service service blueprint
lanes:
  frontstage:
    label: Frontstage
    visibility: external
    order: 0
  backstage:
    label: Backstage
    visibility: internal
    order: 1
nodes:
  start_action:
    type: action
    lane: frontstage
    label: Start Action
    description: Initial action in the blueprint
    next: end_success
  end_success:
    type: terminal
    lane: frontstage
    label: Success
    outcome: success
```

The generated file includes two swimlanes (frontstage and backstage) and a minimal two-node flow: one action node connected to a terminal node.

Run `flowprint init` without a name argument for interactive mode, which prompts for the blueprint name and optional lane customization.

## 3. Open in the Standalone App

### Option A: Use the hosted app

If your team has deployed the Flowprint app (see the [Deployment Guide](deployment.md)), open it in your browser, click **Open File**, and select the `.flowprint.yaml` file.

### Option B: Run locally

```bash
git clone https://github.com/ruminaider/flowprint.git
cd flowprint
pnpm install
pnpm build
pnpm --filter flowprint-app dev
```

Open `http://localhost:5173` in your browser. Click **Open File** and select `my-service.flowprint.yaml`.

## 4. Edit Your Blueprint

The editor provides a visual canvas for building service blueprints. Here are the key features:

### Lanes

Lanes are horizontal bands on the canvas. Double-click a lane header to rename it, drag the handle to reorder lanes, or use the Command Palette (Cmd+K / Ctrl+K) to add and remove lanes. Each lane has a visibility (`external` for customer-facing, `internal` for backend systems) and a display order.

### Nodes

Add nodes from the **floating toolbar** at the bottom of the canvas, or use the Command Palette (Cmd+K / Ctrl+K) to search for node types. Seven node types are available:

| Type       | Purpose                                                    |
| ---------- | ---------------------------------------------------------- |
| `action`   | A step that performs work and transitions to the next node |
| `switch`   | A decision point that routes based on conditions           |
| `parallel` | Fans out to multiple branches and joins at a single node   |
| `wait`     | Pauses until an event occurs or a timeout expires          |
| `error`    | Handles errors from upstream action nodes                  |
| `terminal` | End state of the flow (`success` or `failure`)             |
| `trigger`  | Declares how a workflow starts (schedule, webhook, event, manual) |

### Connections

Click a node's output handle and drag to another node's input handle to create an edge. Edges are stored implicitly in the YAML (via `next`, `cases`, `branches`, etc.) rather than as a separate section.

### Entry Points

Click an action node to open the **node popover**, or double-click to open the **node editor tab**, where you can add **entry points** -- references to the code that implements each step. Each entry point specifies a `file` (relative path from the repository root) and a `symbol` (function or method name).

### Properties

Click any node to edit its label and description in the **node popover**. Double-click to open the full **node editor tab** for detailed metadata and entry point editing.

### YAML Preview

Toggle the YAML preview panel to see the live `.flowprint.yaml` output as you edit. The preview uses the canonical serializer, so the output matches exactly what will be saved to disk.

### Theme

Toggle between **light**, **dark**, and **system** themes. The dark theme uses the Catppuccin Mocha palette.

## 5. Configure Symbol Search (Optional)

Symbol search enables the entry point picker to suggest functions and classes from your codebase as you type.

### Option A: Connect to a code-search server

If you have a [code-search](https://github.com/ruminaider/code-search) instance running:

1. Open **Settings** in the app.
2. Set **Code-search URL** to your server address (e.g., `http://localhost:8080`).
3. Entry point pickers will now suggest symbols from your indexed codebase with semantic search.

### Option B: Use local tree-sitter indexing

1. Open **Settings** in the app.
2. Set **Repository root** to the path of your project.
3. The app indexes your repository's symbols locally using tree-sitter WASM grammars, supporting TypeScript, JavaScript, and Python files.

## 6. Save and Validate

Save your blueprint from the app using `Ctrl+S` (or `Cmd+S` on macOS), or use **File > Save**.

Then validate the file with the CLI:

```bash
flowprint validate my-service.flowprint.yaml
```

Expected output for a valid file:

```
  PASS  my-service.flowprint.yaml
```

If there are issues, the CLI reports them with color-coded severity:

```
  FAIL  my-service.flowprint.yaml
    /nodes/start_action/next: Node reference "missing_node" does not exist
```

To also verify that entry point file paths and symbols exist on disk:

```bash
flowprint validate my-service.flowprint.yaml --check-entry-points
```

## 7. Run Your Blueprint

The dev runner executes entry point functions and walks the graph, producing a trace of every node visited and the output at each step.

```bash
flowprint run my-service.flowprint.yaml --input '{"customer": "test"}'
```

Sample trace output:

```
  ✓ start_action → { processed: true }
  ✓ end_success (terminal: success)

  2 nodes executed in 12ms
```

Use `--json` for structured output, or `--fixtures` to provide mock data for wait nodes.

## 8. Generate Temporal Code (Optional)

Generate Temporal TypeScript workflow scaffolding from your blueprint:

```bash
flowprint generate my-service.flowprint.yaml --output ./generated
```

This creates:

- `workflow.ts` — workflow definition
- `activities.ts` — activity stubs for each action node
- `worker.ts` — worker configuration
- `types.ts` — TypeScript type definitions
- `test-fixtures.ts` — test fixture helpers

The generated code is a starting point, not a runtime dependency. Teams own and extend the output.

## 9. Test Decision Tables (Optional)

If your blueprint uses decision tables (`.rules.yaml` files), create a corresponding test file:

```yaml
# pricing.rules.test.yaml
tests:
  - name: standard customer gets base price
    input:
      customer_type: standard
      order_total: 100
    expected:
      discount: 0
```

Run all test files:

```bash
flowprint test
```

The test runner auto-derives `pricing.rules.yaml` from `pricing.rules.test.yaml`.

## 10. Lint Your Blueprint (Optional)

```bash
flowprint lint my-service.flowprint.yaml
```

The linter checks for best practices beyond schema correctness:

| Rule                  | Default | What it checks                                   |
| --------------------- | ------- | ------------------------------------------------ |
| `node-naming`         | `warn`  | Node IDs should use `snake_case`                 |
| `lane-ordering`       | `error` | External lanes should come before internal lanes |
| `require-description` | `off`   | Action nodes should have descriptions            |
| `no-empty-branches`   | `error` | Parallel nodes must have at least one branch     |

Customize rules by creating a `.flowprintrc.yaml` file:

```yaml
rules:
  node-naming: error
  lane-ordering: warn
  require-description: warn
  no-empty-branches: error
```

## 11. Set Up CI Validation (Optional)

Add a GitHub Actions workflow to validate blueprints on every push and pull request:

```yaml
# .github/workflows/validate-blueprints.yml
name: Validate Blueprints

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g flowprint
      - run: flowprint validate '**/*.flowprint.yaml'
```

## 12. Embed in Your Own App (Optional)

The editor is available as a standalone React component for embedding in your own applications:

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

For the full API reference, theming details, symbol search configuration, and read-only viewer usage, see the [Embedding Guide](../packages/editor/docs/EMBEDDING_GUIDE.md).

## Next Steps

- [YAML Format Reference](yaml-format-reference.md) -- full schema documentation for `.flowprint.yaml` files
- [CLI Reference](cli-reference.md) -- all CLI commands, options, and exit codes
- [Rules Format Reference](rules-format-reference.md) -- decision table schema and test file format
- [Deployment Guide](deployment.md) -- host the standalone app with Docker, Vercel, Cloudflare Pages, AWS, GCP, or GitHub Pages
- [Embedding Guide](../packages/editor/docs/EMBEDDING_GUIDE.md) -- embed the editor component in your React application
