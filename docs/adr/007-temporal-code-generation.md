# ADR-007: Temporal Code Generation

## Status

Accepted

## Date

2025-06-01

## Context

A core Flowprint goal is bridging the gap between visual blueprints and running services. Blueprints define the structure of a service flow, but to execute them, we need to generate code targeting a durable execution runtime. We evaluated four candidates:

- **AWS Step Functions**: tightly coupled to AWS, JSON-based state machine definition, limited local testing story, vendor lock-in.
- **Camunda (Zeebe)**: BPMN-native, strong enterprise features, but requires deploying and operating a Zeebe cluster, and the BPMN model is more complex than our six-node vocabulary.
- **Apache Airflow**: designed for data pipelines with DAG scheduling semantics, not request-driven service flows. Poor fit for long-running workflows with external event waits.
- **Temporal**: language-native workflows (TypeScript/Go/Java), durable execution with automatic retries and state persistence, strong local development story with `temporal server start-dev`, and open-source with a managed cloud option.

The critical differentiator was that Temporal workflows are written in the same language as the application (TypeScript in our case), meaning generated code looks like code a developer would write by hand. Step Functions requires learning Amazon States Language; Camunda requires BPMN XML; Airflow requires its own DAG API. Temporal's approach makes the generated code readable, debuggable, and modifiable.

## Decision

We target Temporal as the code generation backend and introduce supporting infrastructure:

1. **Schema 2.0 bridge fields.** The blueprint schema gains optional `workflow`, `temporal`, `inputs`, and `compensation` sections that carry the metadata needed for code generation: activity timeouts, retry policies, task queue names, input parameter schemas, and compensation steps.

2. **Code generators.** The engine package provides generators that produce a complete Temporal project from a blueprint:
   - **Workflow file**: a TypeScript function mirroring the blueprint's flow structure, with `switch` mapping to if/else, `parallel` mapping to `Promise.all`, `wait` mapping to Temporal's `condition` or `sleep`, and `error` mapping to try/catch.
   - **Activities file**: stub functions for each action node, with typed input/output signatures derived from the blueprint.
   - **Worker file**: Temporal worker bootstrap code referencing the workflow and activities.
   - **Types file**: TypeScript interfaces for workflow inputs, activity parameters, and results.
   - **Test fixtures**: sample data for testing the generated workflow locally.

3. **Dev runner for local testing.** Before generating Temporal code, users can test their blueprint logic locally using a dev runner that executes the flow in a `node:vm` sandbox. The dev runner interprets the same blueprint structure the code generators consume, so behavior is consistent: if the flow works in the dev runner, the generated Temporal workflow will follow the same execution path.

4. **Generated code is meant to be owned.** The code generators produce a starting point, not a continuously regenerated output. Teams are expected to take the generated project, commit it to their repository, and evolve it. Re-running the generator overwrites files, so it is a bootstrap tool, not a managed output.

## Consequences

### Positive

- Generated Temporal workflows are idiomatic TypeScript that developers can read, debug, and modify without learning a proprietary runtime DSL. The generated code looks like hand-written code.
- The dev runner provides a fast local feedback loop: users validate blueprint logic in seconds without deploying to Temporal, then generate the Temporal project when ready.
- Schema 2.0 bridge fields keep execution metadata alongside the blueprint definition, so a single `.flowprint.yaml` file carries everything needed for both visual editing and code generation.
- Temporal's durable execution model handles retries, timeouts, and crash recovery at the infrastructure level, meaning the generated code does not need to implement these concerns manually.
- Open-source Temporal server can run locally or in CI, and Temporal Cloud is available for production — teams choose their deployment model without changing generated code.

### Negative

- Temporal is a runtime dependency for the generated code. Teams that do not want to operate Temporal (or pay for Temporal Cloud) cannot use the generated output without significant rework.
- The "generate once, then own" model means blueprint changes after initial generation require manual synchronization between the blueprint and the generated code. There is no incremental update or diff-and-patch mechanism.
- Schema 2.0 bridge fields add complexity to the blueprint format. Blueprints that are only used for documentation or visual communication carry schema sections they do not need.
- The dev runner and the Temporal runtime are not identical execution environments. Edge cases around concurrency, timing, and error propagation may behave differently in `node:vm` than in Temporal's deterministic execution model.
- Supporting additional code generation targets in the future (e.g., Inngest, Hatchet, or Restate) would require either abstracting the generator interface or building parallel generators, both of which add maintenance burden.
