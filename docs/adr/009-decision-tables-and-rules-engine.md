# ADR-009: Decision Tables and Rules Engine

## Status

Accepted

## Date

2026-03-02

## Context

Business rules in service blueprints are often buried in code — discount tiers, routing logic, eligibility checks, fraud thresholds. When these rules live inside action node implementations, they become invisible to business stakeholders and difficult to modify without developer involvement.

We needed a way to declare business rules alongside blueprints that:
- Is readable by non-developers (product managers, business analysts)
- Can be tested independently of the workflow engine
- Supports common rule patterns (comparison operators, set membership, range checks)
- Works in both Node.js and browser environments

We evaluated GoRules JDM (a full-featured decision model library) but rejected it: its format is opaque JSON, its editor requires a specific React integration, and it pulls in dependencies that conflict with our lean schema package constraint (ADR-001). We needed something simpler that fits Flowprint's YAML-first philosophy.

## Decision

We introduce `.rules.yaml` files as a companion format to `.flowprint.yaml` blueprints. Each rules file contains a single decision table with:

- **Hit policy**: Controls evaluation behavior — `first` (stop at first match), `collect` (gather all matches), `all` (all rules must match), or `priority` (ordered by explicit priority field).
- **Inputs**: Declared input field paths (dot-notation, e.g., `order.total_amount`).
- **Rules**: An ordered list of `when`/`then` pairs. Conditions use structured operators (`eq`, `not_eq`, `gt`, `gte`, `lt`, `lte`, `in`, `not_in`, `between`) or shorthand scalars (a bare value means `eq`). Outputs are arbitrary key-value maps.

The evaluation engine is split into two entry points:
- `@ruminaider/flowprint-engine` — Full Node.js evaluator with file I/O and AST interpretation.
- `@ruminaider/flowprint-engine/browser` — Pure evaluation logic with zero Node.js dependencies, suitable for browser-based simulation and the decision table editor.

The editor provides an `EditableDecisionTable` component with:
- Click-to-edit cells with local draft state (keystrokes don't create undo entries; only Enter/blur commits)
- A `ConditionBuilder` for structured condition editing (operator dropdown + value inputs)
- Row and column management (add, delete, duplicate, drag-to-reorder)
- Hit policy selector dropdown
- Real-time validation (empty required fields flagged visually)
- Integration with the unified undo stack (`useFlowprintState`)

Rules files use a mutual exclusion constraint with `entry_points` and `cases`: a node that references a rules file delegates its branching logic to the decision table rather than using inline case expressions.

Testing is supported via `.rules.test.yaml` files — structured test cases that declare inputs and expected outputs, run by `flowprint test [glob]` in the CLI.

## Consequences

### Positive

- Business rules are declarative and readable: a decision table with 5 rules is immediately understandable without reading code.
- Rules can be tested independently via `flowprint test`, catching logic errors before deployment.
- The browser-safe evaluator enables instant feedback in the editor — users see rule evaluation results without a server round-trip.
- The YAML format integrates naturally with version control (meaningful diffs, merge-friendly).
- The structured operator set prevents ambiguous conditions while remaining expressive enough for most business rules.

### Negative

- Two file formats (`.flowprint.yaml` and `.rules.yaml`) means two sets of validation, serialization, and documentation to maintain.
- The custom decision table editor is a significant maintenance surface compared to using an off-the-shelf solution.
- The operator set is intentionally limited — complex rules requiring regex matching, date arithmetic, or cross-field calculations must be handled in action node code rather than in decision tables.
- Hit policy semantics must be understood by authors; incorrect hit policy selection (e.g., `first` when `collect` is needed) produces subtle logic errors.
