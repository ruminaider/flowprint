# Flowprint

Visual service blueprint editor. Produces `.flowprint.yaml` files consumed by code-search.

## Monorepo Structure

```
packages/
  schema/   @ruminaider/flowprint-schema   (tsup  -> ESM + CJS + .d.ts)
  editor/   @ruminaider/flowprint-editor   (Vite lib mode -> ESM + .d.ts + CSS)
  cli/      flowprint                       (tsup  -> CJS Node.js binary)
  app/      flowprint-app (private)         (Vite  -> static site)
```

Dependency graph: `schema` has zero dependents. `editor` and `cli` depend on `schema`. `app` depends on `editor` + `schema`. Editor and CLI are siblings -- neither depends on the other.

## Commands

```sh
pnpm install                  # install all deps
pnpm build                    # turbo build (respects dependency order)
pnpm test                     # vitest (unit tests, all packages)
pnpm test:e2e                 # playwright (E2E tests)
pnpm lint                     # eslint
pnpm typecheck                # tsc --noEmit
pnpm format                   # prettier --write
pnpm format:check             # prettier --check (CI)
pnpm size                     # bundle size check (editor < 300KB gzipped)

# Single package
pnpm --filter @ruminaider/flowprint-schema build
pnpm --filter @ruminaider/flowprint-schema test
```

## Critical Invariants

### 1. JSON Schema is the source of truth

TypeScript types in the schema package are GENERATED from `flowprint.schema.json` via `json-schema-to-typescript`. Never edit `types.ts` directly -- it will be overwritten on build. To change types, modify the JSON Schema and regenerate.

### 2. Single canonical YAML serializer

`serialize()` in `@ruminaider/flowprint-schema` is the ONLY way to produce `.flowprint.yaml` output. Both editor and CLI must use it. Never serialize YAML with `yaml.dump()`, `JSON.stringify()`, or any other method. The serializer enforces deterministic key ordering and formatting.

Key order (top-level): `schema`, `name`, `version`, `description`, `metadata`, `lanes`, `nodes`
Key order (nodes): `type`, `lane`, `label`, `description`, `metadata`, `entry_points`, then type-specific fields

### 3. Schema versioning

The `schema` field uses `flowprint/1.0` format (major.minor). Minor = backward-compatible additions only. Consumers accept any version within their supported major (e.g., a tool supporting 1.x accepts 1.0, 1.1, 1.2). The schema package exports `SUPPORTED_VERSIONS`.

### 4. Schema package has zero runtime deps besides ajv

Keep it lean. The schema package must remain usable from any JS/TS context (browser, Node, Deno) without pulling in heavy dependencies.

### 5. Pin tree-sitter WASM grammar versions

Both CLI and editor use tree-sitter WASM grammars. Pin exact versions to prevent breakage. Tree-sitter grammars must be loaded lazily in the editor (only when symbol search is activated).

### 6. Structural validation is separate from schema validation

`ajv` validates shapes against JSON Schema. Structural validation (dangling node refs, lane refs, orphan nodes, cycles) is custom code that runs after schema validation. Both are part of `validate()` but produce distinct error categories.

## Naming Conventions

- Node IDs in blueprints: `snake_case` (e.g., `complete_consultation`, `evaluate_treatment`)
- npm scope: `@ruminaider`
- File extension: `*.flowprint.yaml`
- Package names: `@ruminaider/flowprint-schema`, `@ruminaider/flowprint-editor`, `flowprint` (CLI)

## Node Types

Six types: `action`, `switch`, `parallel`, `wait`, `error`, `terminal`. Edges are implicit in node definitions (`next`, `cases[].next`, `branches[]`, `join`, `error.catch`), not stored separately.

## Code Style

- TypeScript strict mode, ES2022 target
- Prettier: no semicolons, single quotes, 2-space indent, trailing commas, 100 char width
- ESLint: strict type-checked + stylistic rules, React rules only in editor/app packages

## Testing

- **Unit tests:** Vitest with workspace support. Each package has `vitest.config.ts`.
- **E2E tests:** Playwright (Chromium). Config at root `playwright.config.ts`.
- **Coverage:** `@vitest/coverage-v8`

## Versioning

Uses Changesets (`@changesets/cli`). Each PR that changes a package should include a changeset. CI automates publishing.
