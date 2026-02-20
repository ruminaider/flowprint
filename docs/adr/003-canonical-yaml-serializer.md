# ADR-003: Canonical YAML Serializer

## Status

Accepted

## Date

2025-01-15

## Context

When multiple code paths can produce the same logical output in different textual forms, version control diffs become noisy and unreliable. YAML serialization libraries allow configurable key ordering, quoting styles, indentation, and flow vs. block formatting. If the editor, CLI, and any future tools each serialize blueprints independently — even using the same library with different options — the same blueprint can produce different YAML text depending on which tool last saved it.

This matters for Flowprint because blueprint files are committed to version control and reviewed in pull requests. Spurious diffs (reordered keys, changed quoting) obscure real changes and erode trust in the review process. We also need CI pipelines to be able to round-trip blueprints deterministically: loading and re-saving a file without changes must produce identical output.

## Decision

We implement a single `serialize()` function in the schema package as the only sanctioned way to produce `.flowprint.yaml` content:

1. **One function, one output.** The `serialize()` function accepts a validated blueprint object and returns a YAML string. No other code path in the monorepo writes blueprint YAML.

2. **Deterministic key ordering.** Keys within each YAML mapping are emitted in a fixed, semantically meaningful order defined by the serializer (e.g., `id` before `type` before `name` before type-specific fields). This ordering is not alphabetical — it follows the logical reading order of a node definition.

3. **Consistent formatting rules.** The serializer enforces block style for mappings and sequences, double-quoting for strings that require it, and 2-space indentation. These choices are not configurable; they are baked into the function.

4. **Round-trip integrity as a tested invariant.** The test suite includes round-trip tests: parse a YAML file, serialize it back, and assert byte-for-byte equality. Any change to serialization behavior that breaks existing files is a test failure.

## Consequences

### Positive

- Pull request diffs show only meaningful changes. Reviewers can trust that every changed line reflects an intentional edit, not a serialization artifact.
- CI can validate blueprints by round-tripping them: `serialize(parse(file))` must equal the original file. This catches corruption, manual edits that violate formatting rules, and tooling bugs.
- All consumers of the schema package (editor, CLI, app) share the same serialization behavior automatically. There is no integration risk from format divergence.
- The fixed key ordering makes blueprints scannable — you always know where to find a node's type, name, or next pointer because the structure is predictable.

### Negative

- Contributors cannot customize YAML formatting preferences (e.g., single vs. double quotes, indentation width). The serializer's choices are final.
- Any bug in `serialize()` affects every tool and every saved file. There is no fallback serialization path, making the function a single point of failure for all YAML output.
- Updating the serialization format (e.g., changing key order for a new field) requires a migration step for existing files, since all committed blueprints must match the new canonical form.
- Hand-edited YAML files may not match the canonical format. Users who edit blueprints manually need to run the serializer (via CLI) to normalize formatting before committing.
