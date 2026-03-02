# ADR-010: Browser-Safe Simulation Engine

## Status

Accepted

## Date

2026-03-02

## Context

Flowprint's engine package (`@ruminaider/flowprint-engine`) evaluates blueprints and rules at runtime. The original implementation relied on Node.js-specific APIs — `node:vm` for safe expression evaluation, `node:fs` for file loading, and `node:path` for path resolution. This made it impossible to run workflow simulations in the browser, which is where the editor lives.

We wanted users to get instant feedback when editing blueprints and decision tables: "if I change this rule, what happens to this test case?" This requires evaluation logic that runs entirely in the browser without a server round-trip.

The challenge was sharing as much logic as possible between the Node.js and browser paths while keeping the browser bundle free of Node.js dependencies that would fail in browser environments.

## Decision

We adopt a **split entry point** architecture for the engine package:

- `@ruminaider/flowprint-engine` — The full Node.js entry point. Includes file I/O, `node:vm`-based expression evaluation, and the complete workflow walker.
- `@ruminaider/flowprint-engine/browser` — A browser-safe subset. Contains pure evaluation logic (condition operators, dot-path resolution, hit policy evaluation) with zero Node.js dependencies.

The browser evaluator (`evaluator-browser.ts`) provides:
- `evaluateCondition(condition, context)` — Evaluates a single condition against a context object using the structured operator set.
- `evaluateRules(rulesData, context)` — Evaluates an entire decision table against a context, respecting hit policy.
- `resolveDotPath(obj, path)` — Resolves dot-notation paths (e.g., `order.total_amount`) against nested objects.

The Node.js evaluator imports from the browser module and adds file-loading and vm-based capabilities on top. This ensures the core evaluation logic is shared — a rule that passes in the browser evaluator will produce the same result in the Node.js evaluator.

The package's `exports` map in `package.json` exposes both entry points:
```json
{
  ".": { "import": "./dist/index.js" },
  "./browser": { "import": "./dist/browser.js" }
}
```

Build tooling (Vite's library mode with chunk-splitting) ensures the browser entry point contains only the shared evaluation code, producing a minimal bundle (~350 bytes gzipped).

## Consequences

### Positive

- Users get instant feedback in the editor when editing decision tables — no server required.
- The browser evaluator can power a "simulation panel" that shows rule evaluation results as users modify conditions.
- The shared evaluation core guarantees consistency: rules behave identically in the editor preview and in production.
- The browser bundle is minimal (~350B gzipped), adding negligible overhead to the editor package.
- The `./browser` export map convention is standard and works with all modern bundlers.

### Negative

- Two execution paths (Node.js and browser) must be maintained and tested for consistency. A change to operator semantics must be verified in both environments.
- The browser evaluator is intentionally limited — it cannot evaluate arbitrary JavaScript expressions (no `node:vm` equivalent). Complex computed conditions require the full Node.js engine.
- The split entry point adds build complexity: chunk-splitting configuration, separate test suites, and export map verification.
- Expression evaluation in the browser uses an AST interpreter (acorn-based) rather than `node:vm`, which is slower for complex expressions but sufficient for the interactive editing use case.
