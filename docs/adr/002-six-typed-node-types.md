# ADR-002: Six Typed Node Types

## Status

Accepted

## Date

2025-01-15

## Context

Workflow and process modeling standards offer varying levels of expressiveness. BPMN 2.0 defines over 50 element types across events, activities, gateways, and data objects. While comprehensive, this breadth creates a steep learning curve — most practitioners use fewer than 10 element types in practice, and the full specification requires significant training to apply correctly.

Service blueprints have a more focused scope than general business process models. They describe how a service handles requests: performing actions, branching on conditions, running work in parallel, waiting for external events, handling errors, and terminating. We needed a node vocabulary that was small enough to learn in minutes but expressive enough to model real service flows without workarounds.

We also needed every node type to carry clear runtime semantics, since blueprints are not just documentation — they are intended to be executable via code generation.

## Decision

We define exactly six node types, each mapping to a distinct runtime semantic:

1. **action** — Performs a unit of work (API call, database operation, computation). The fundamental building block. Has a `next` field pointing to the following node.

2. **switch** — Conditional branching. Evaluates an expression and routes to one of several `cases`, each with a condition and a target node. Includes a default case.

3. **parallel** — Concurrent execution. Defines `branches` that execute simultaneously. All branches must complete before the flow continues to `next`.

4. **wait** — Pauses execution until an external event or condition is met (timer expiry, webhook arrival, human approval). Distinct from action because it implies durable suspension, not active computation.

5. **error** — Error handling boundary. Wraps a section of the flow and defines `catch` handlers for specific error types. Maps directly to try/catch semantics in generated code.

6. **terminal** — Marks the end of a flow path. No `next` field. Carries a `status` (completed, failed, cancelled) to indicate the outcome.

Expressiveness beyond these six types is achieved through composition: an action inside an error node with a parallel node gives you "concurrent work with error handling" without needing a dedicated composite element type.

## Consequences

### Positive

- The full vocabulary can be learned in a single sitting. New team members can read and author blueprints without BPMN training.
- Each node type maps directly to a runtime concept (function call, if/else, Promise.all, sleep/wait, try/catch, return), making code generation straightforward.
- Schema validation is simpler: six discriminated union variants with well-defined fields, rather than dozens of element types with overlapping capabilities.
- The editor UI stays manageable — six palette items, six property panels, six rendering strategies.

### Negative

- Some patterns that BPMN handles with a single element require composition in Flowprint. For example, a "timer boundary event" in BPMN requires an error node wrapping an action with a wait-based catch handler.
- Teams coming from BPMN may initially look for familiar elements (exclusive gateways, intermediate events, sub-processes) and need to learn the Flowprint equivalents.
- If future requirements demand semantics that don't fit any of the six types (e.g., a "loop" node for iteration), we face a decision between adding a seventh type — breaking the simplicity principle — or expressing it as a pattern using existing types.
- The small type set means each type carries more responsibility; changes to a single node type's schema can have broad impact across the codebase.
