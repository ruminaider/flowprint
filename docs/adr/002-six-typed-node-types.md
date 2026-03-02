# ADR-002: Seven Typed Node Types

## Status

Accepted (amended 2026-03-02 to add trigger node)

## Date

2025-01-15

## Context

Workflow and process modeling standards offer varying levels of expressiveness. BPMN 2.0 defines over 50 element types across events, activities, gateways, and data objects. While comprehensive, this breadth creates a steep learning curve — most practitioners use fewer than 10 element types in practice, and the full specification requires significant training to apply correctly.

Service blueprints have a more focused scope than general business process models. They describe how a service handles requests: performing actions, branching on conditions, running work in parallel, waiting for external events, handling errors, and terminating. We needed a node vocabulary that was small enough to learn in minutes but expressive enough to model real service flows without workarounds.

We also needed every node type to carry clear runtime semantics, since blueprints are not just documentation — they are intended to be executable via code generation.

## Decision

We define exactly seven node types, each mapping to a distinct runtime semantic:

1. **action** — Performs a unit of work (API call, database operation, computation). The fundamental building block. Has a `next` field pointing to the following node.

2. **switch** — Conditional branching. Evaluates an expression and routes to one of several `cases`, each with a condition and a target node. Includes a default case.

3. **parallel** — Concurrent execution. Defines `branches` that execute simultaneously. All branches must complete before the flow continues to `next`.

4. **wait** — Pauses execution until an external event or condition is met (timer expiry, webhook arrival, human approval). Distinct from action because it implies durable suspension, not active computation.

5. **error** — Error handling boundary. Wraps a section of the flow and defines `catch` handlers for specific error types. Maps directly to try/catch semantics in generated code.

6. **terminal** — Marks the end of a flow path. No `next` field. Carries a `status` (completed, failed, cancelled) to indicate the outcome.

7. **trigger** — Defines how a workflow starts. Specifies the entry condition (schedule, webhook, event, or manual) and points to the first action node via `next`. Uses the standard `next` field (not a special `starts` field) to reuse existing edge infrastructure; the editor visually distinguishes trigger edges with dashed lines based on source node type. Trigger nodes have no incoming edges and don't execute logic — they declare the workflow's activation mechanism. Making triggers visible as nodes (rather than metadata) follows Flowprint's visualization-first principle: business stakeholders see the complete flow from "what starts it" through "what it does" to "how it ends."

Expressiveness beyond these seven types is achieved through composition: an action inside an error node with a parallel node gives you "concurrent work with error handling" without needing a dedicated composite element type.

## Consequences

### Positive

- The full vocabulary can be learned in a single sitting. New team members can read and author blueprints without BPMN training.
- Each node type maps directly to a runtime concept (function call, if/else, Promise.all, sleep/wait, try/catch, return, event listener), making code generation straightforward.
- Schema validation is simpler: seven discriminated union variants with well-defined fields, rather than dozens of element types with overlapping capabilities.
- The editor UI stays manageable — seven palette items, seven property panels, seven rendering strategies.
- The trigger node makes workflow entry points explicit and visible, helping business stakeholders understand the complete flow at a glance.

### Negative

- Some patterns that BPMN handles with a single element require composition in Flowprint. For example, a "timer boundary event" in BPMN requires an error node wrapping an action with a wait-based catch handler.
- Teams coming from BPMN may initially look for familiar elements (exclusive gateways, intermediate events, sub-processes) and need to learn the Flowprint equivalents.
- Seven types is still small but no longer fits the "exactly six" mental model. Future additions should be considered very carefully to avoid vocabulary creep.
- The small type set means each type carries more responsibility; changes to a single node type's schema can have broad impact across the codebase.
