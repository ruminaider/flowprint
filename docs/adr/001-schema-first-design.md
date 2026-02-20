# ADR-001: Schema-First Design

## Status

Accepted

## Date

2025-01-15

## Context

Visual editors for workflows and service blueprints typically store their data in proprietary binary or JSON formats that are tightly coupled to the editor's internal representation. This creates several problems for engineering teams:

- Blueprints cannot be meaningfully reviewed in pull requests because the format is opaque or noisy.
- CI/CD pipelines cannot validate blueprints without importing the editor as a dependency.
- Teams are locked into a specific editor; switching tools means migrating formats.
- Collaboration through version control is impractical when diffs are unreadable.

We needed a design that treated the blueprint definition as a first-class engineering artifact — human-readable, diffable, and independently validatable — while still supporting a rich visual editing experience.

## Decision

We adopt a schema-first architecture where YAML is the source of truth for all blueprint data:

1. **JSON Schema is the canonical specification.** Every valid `.flowprint.yaml` file is defined by a JSON Schema document. The schema specifies node types, their fields, validation constraints, and structural rules.

2. **TypeScript types are generated from the schema.** We never hand-author TypeScript type definitions for blueprint data. A build step generates `types.ts` from the JSON Schema, ensuring the type system and validation rules cannot drift apart.

3. **Round-trip fidelity is mandatory.** Loading a `.flowprint.yaml` into the editor and saving it back must produce an identical file (assuming no user edits). No visual-only state — such as viewport position, selection, or UI preferences — is persisted in the blueprint file.

4. **The editor works with parsed blueprint objects.** The editor receives a typed blueprint object and emits changes as new blueprint objects. It never reads or writes YAML directly; serialization is handled by a dedicated layer.

## Consequences

### Positive

- Blueprints are human-readable YAML files that produce clean, reviewable diffs in version control.
- Any tool that can validate JSON Schema can validate blueprints without depending on the editor or any Flowprint library.
- Generated TypeScript types guarantee compile-time safety that exactly matches runtime validation, eliminating an entire class of type-vs-schema mismatch bugs.
- Teams can author or patch blueprints by hand in any text editor when the visual editor is unnecessary.
- The schema serves as living documentation for the blueprint format.

### Negative

- Adding a new field requires updating the JSON Schema first, regenerating types, then updating the editor — a three-step process instead of just changing a TypeScript interface.
- YAML has syntactic edge cases (implicit type coercion, indentation sensitivity) that can surprise users editing files by hand.
- Visual-only features like minimap position, zoom level, or collapsed lane state must be stored separately (e.g., in editor-local state or a companion file), which adds complexity.
- Round-trip fidelity constrains how we can transform or normalize blueprint data internally; any lossy transformation would break the invariant.
