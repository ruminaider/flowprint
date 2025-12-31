# Flowprint CLI Reference

The `flowprint` CLI validates, lints, diffs, and scaffolds `.flowprint.yaml` service blueprints.

## Installation

```sh
npm install -g flowprint
# or
pnpm add -g flowprint
```

## Commands

### `flowprint validate <glob>`

Validate `.flowprint.yaml` files against the JSON Schema and structural rules.

```sh
flowprint validate "examples/*.flowprint.yaml"
flowprint validate path/to/blueprint.flowprint.yaml
flowprint validate "**/*.flowprint.yaml" --check-entry-points
```

**Options:**

| Option | Description |
|---|---|
| `--check-entry-points` | Verify that referenced files exist and entry point symbols are defined |

**Output:**

- `PASS` (green) for valid files
- `WARN` (yellow) for files with warnings only (e.g., orphan nodes)
- `FAIL` (red) for files with validation errors

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | All files valid |
| 1 | Validation errors found |
| 2 | File not found or parse error |

### `flowprint lint <glob>`

Lint `.flowprint.yaml` files with configurable style rules.

```sh
flowprint lint "examples/*.flowprint.yaml"
flowprint lint "**/*.flowprint.yaml" --config .flowprintrc.yaml
```

**Options:**

| Option | Description |
|---|---|
| `--config <path>` | Path to a `.flowprintrc.yaml` config file |

**Rules:**

| Rule | Default | Description |
|---|---|---|
| `node-naming` | `warn` | Enforce snake_case for node IDs |
| `lane-ordering` | `error` | External lanes should come before internal lanes (by order) |
| `require-description` | `off` | Action nodes should have descriptions |
| `no-empty-branches` | `error` | Parallel nodes must have non-empty branches |

Each rule can be set to `error`, `warn`, or `off`.

**Configuration file (`.flowprintrc.yaml`):**

```yaml
rules:
  node-naming: error
  lane-ordering: warn
  require-description: warn
  no-empty-branches: error
```

The CLI looks for `.flowprintrc.yaml` or `.flowprintrc.yml` in the current directory by default.

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | No lint errors |
| 1 | Lint errors found |
| 2 | File not found or parse error |

### `flowprint diff <file1> <file2>`

Show structural differences between two `.flowprint.yaml` files.

```sh
flowprint diff old.flowprint.yaml new.flowprint.yaml
```

Reports:
- Nodes added, removed, or modified
- Edges added or removed
- Lanes added, removed, or modified

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Always (informational command) |

### `flowprint migrate`

Migrate `.flowprint.yaml` files to the latest schema version.

```sh
flowprint migrate
```

Currently a placeholder that reports the latest version.

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Already at latest version |

### `flowprint init [name]`

Create a starter `.flowprint.yaml` blueprint with interactive prompts.

```sh
flowprint init my-service
flowprint init my-service --non-interactive
flowprint init my-service -o path/to/output.flowprint.yaml
```

**Options:**

| Option | Description |
|---|---|
| `--non-interactive` | Skip interactive prompts and use defaults |
| `-o, --output <path>` | Output file path (defaults to `<name>.flowprint.yaml`) |

The generated blueprint includes:
- Schema version `flowprint/1.0`
- Two default lanes: frontstage (external) and backstage (internal)
- One action node and one terminal node

Uses `serialize()` from `@ruminaider/flowprint-schema` to produce canonical YAML output.

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Blueprint created successfully |
| 2 | File already exists |

## Global Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Validation or lint errors found |
| 2 | File not found, parse error, or other I/O error |

## Entry Point Checking

The `--check-entry-points` flag on the `validate` command verifies that:

1. Files referenced in `entry_points[].file` exist relative to the project root
2. Symbols referenced in `entry_points[].symbol` are defined in the file

Symbol checking uses regex-based heuristics for supported languages:
- **Python**: `def <symbol>` or `class <symbol>`
- **TypeScript/JavaScript**: `function <symbol>`, `const <symbol>`, `class <symbol>` (with optional `export` and `async` prefixes)

For unsupported file types, only file existence is checked. Broken references are reported as warnings.
