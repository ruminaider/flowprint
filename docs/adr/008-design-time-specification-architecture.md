# ADR-008: Design-Time Specification Architecture

## Status

Accepted (amended by ADR-011)

## Date

2026-03-03

## Context

Business workflows — the rules governing how orders are processed, patients are routed, claims are adjudicated — are among the highest-value logic in any application. Yet this logic is routinely buried inside application source code, invisible to the people who define it and difficult to reason about for the people who maintain it.

This creates three compounding problems:

1. **Business logic is invisible.** A 200-line TypeScript function implementing an order routing workflow encodes critical business decisions, but a product manager, operations lead, or even a new developer cannot look at the source and understand the flow. The "what" and "why" of the business process are lost in implementation details — error handling, SDK calls, type conversions, retry logic. Reviewing changes to this logic in a pull request requires deep familiarity with the codebase.

2. **Design artifacts and running code are disconnected.** Teams frequently design workflows in tools like Mermaid, Lucidchart, or Notion — but these diagrams are documentation, not specifications. They cannot be validated, tested, or executed. The diagram and the code diverge within days of implementation. There is no tool that produces a visual design artifact that is also the source of truth for code generation.

3. **Runtime platforms own your logic.** Tools that do bridge visual design and execution — n8n, Camunda, AWS Step Functions, Windmill — require running your workflow on their platform. The visual representation is coupled to their runtime. If you outgrow the platform, migrate to a different execution model, or need to embed the logic in your own application, you face a rewrite. Business logic becomes a platform dependency rather than an engineering asset.

### Competitive landscape

We evaluated the existing ecosystem of workflow tools and found that no existing tool simultaneously provides:

- A **visual editor** for designing workflows
- A **human-readable, declarative artifact** (not BPMN XML, not proprietary JSON) designed for version control
- **Code generation** targeting developer-owned application code (not platform-locked execution)
- **Integrated decision tables** for business rules
- A **dev runner** for local testing without infrastructure
- **Zero vendor lock-in** — the artifact is portable, the generated code runs on standard infrastructure

| Tool | Visual editor | Readable artifact | Code generation | Decision tables | Vendor-free |
|------|--------------|-------------------|----------------|----------------|-------------|
| n8n | Yes | No (JSON export) | No | No | Yes |
| Temporal | No | N/A (code-first) | N/A | No | Yes |
| Windmill | Yes | Yes (YAML) | No | No | Yes |
| AWS Step Functions | Yes | Partial (ASL) | No | No | No |
| Camunda | Yes | No (BPMN XML) | No | Yes (DMN) | Partial |
| GoRules | Yes (rules only) | Yes (JSON) | No | Yes | Yes |

Windmill comes closest with YAML-based flow definitions and a visual editor, but its YAML is coupled to the Windmill runtime — it cannot generate portable application code. Camunda shares the philosophy of separating design from implementation and includes DMN decision tables, but its artifact format (BPMN XML) is verbose and unreadable in version control diffs, and it requires deploying the Zeebe engine. AWS Step Functions Workflow Studio produces a declarative artifact (ASL), but ASL mixes business logic with AWS infrastructure references and is locked to the AWS ecosystem.

The gap is a tool that treats workflow design as a **specification activity** — producing a portable, human-readable artifact that bridges business stakeholders and developers — and then generates code targeting the team's own infrastructure.

## Decision

We adopt a design-time specification architecture where the blueprint is a portable, declarative artifact that bridges business intent and executable code:

1. **Flowprint is an integrated design-to-execution pipeline.** The YAML artifact flows through every stage — visual editing, validation, simulation, execution — and each stage adds value without modifying the artifact's canonical form. No single stage is the product; the seamless chain from design through execution is. *(Planned per ADR-011: the pipeline now includes direct runtime execution via an embedded engine, not just code generation.)*

2. **The specification is runtime-agnostic.** Blueprints and rules files describe business logic without encoding runtime-specific semantics. The embedded execution engine loads blueprints at runtime and orchestrates them directly. Durability adapters (Temporal, plain in-process) are pluggable — the blueprint does not change based on the execution target. Code generation to Temporal is retained as an optional eject path. Runtime-specific metadata (timeouts, retry policies, task queues) lives in namespaced sections that adapters consume and other tools ignore. *(Planned per ADR-011: the primary developer experience shifts from code generation to engine execution.)*

3. **Business stakeholders own flow logic; developers own execution.** The visual editor and decision table editor are designed so that business analysts, operations leads, and service managers can define processes, routing rules, and SOPs without developer involvement. Developers register handler functions for side-effect nodes (API calls, database writes) and choose a durability adapter. Neither audience depends on the other for their core work, but both collaborate on the same artifact — the engine is the bridge.

4. **Keep the schema lean; push complexity into tooling.** The YAML specification stays flat, declarative, and readable in a pull request diff. Sophistication belongs in the editor (visual abstractions, simulation), the engine (expression evaluation, rule interpretation), and the code generators (idiomatic output) — not in the file format. A business stakeholder should be able to read a `.flowprint.yaml` and understand the flow without technical context.

5. **Git is the system of record.** Blueprints and rules are plain files designed for version control — deterministic serialization produces clean diffs, separate `.rules.yaml` files enable independent changesets, and the canonical serializer enforces consistent formatting. There is no database, no server state, and no proprietary storage format. If it's not in the repository, it doesn't exist.

## Consequences

### Positive

- Business workflows are visible and reviewable. A product manager can look at a `.flowprint.yaml` file (or its visual rendering) and understand the flow without reading application code. Pull requests that change business logic show readable YAML diffs, not opaque code changes.

- The blueprint is a shared language between roles. Developers, architects, and business stakeholders collaborate on the same artifact. The visual editor makes it accessible; the YAML makes it precise; the schema makes it validatable.

- Teams own their code and their infrastructure. Generated code is standard TypeScript that lives in the team's repository and runs on their infrastructure. There is no runtime dependency on Flowprint itself — if the team stops using Flowprint tomorrow, their generated code continues to work unchanged.

- Code generation targets are extensible. Because the blueprint is a declarative specification (not an execution format), new code generation targets can be added without changing the blueprint format. A team could generate Temporal workflows today and Inngest functions tomorrow from the same `.flowprint.yaml`.

- Decision tables bring business rules into the specification. Rules that would otherwise be buried in conditional logic are expressed declaratively in `.rules.yaml` files, linked to workflow nodes, and evaluated during both simulation and code generation. Business stakeholders can read and validate these rules directly.

- The dev runner and browser simulator provide fast feedback. Teams can test workflow logic locally in milliseconds without deploying infrastructure, reducing the iteration cycle from "deploy and observe" to "edit and simulate."

### Negative

- ~~Flowprint is not a runtime. Teams must still choose, deploy, and operate an execution engine (Temporal, or a future supported target). Flowprint reduces the cost of writing the workflow code but does not eliminate the operational complexity of running it.~~ *(Planned per ADR-011: Flowprint is now an embeddable execution engine. Teams embed the engine directly; Temporal is an optional durability adapter.)*

- ~~The "design then generate" model introduces a synchronization gap. After initial generation, changes to the blueprint require regenerating code and manually merging with any hand-written modifications. There is no incremental update mechanism.~~ *(Planned per ADR-011: the engine loads blueprints at runtime, eliminating the generate-then-own synchronization gap.)*

- ~~The target audience sits at an intersection that may be narrow. Teams comfortable with Temporal tend to be code-first and may not see value in a visual design layer. Teams wanting visual workflow design tend to expect an integrated runtime. Flowprint must convince both groups that the specification-first model is worth the extra step.~~ *(Planned per ADR-011: Flowprint now provides both the visual design layer AND an integrated runtime, addressing both audience expectations.)*

- ~~Supporting multiple code generation targets adds maintenance burden. Each target requires its own generator, its own test suite, and its own documentation. The blueprint format must remain general enough to map to different execution models without becoming lowest-common-denominator.~~ *(Planned per ADR-011: the engine executes blueprints directly. Durability adapters are thin wrappers around the same engine, not full parallel code generators.)*

- The visual editor is a significant engineering investment. Building and maintaining a production-quality React-based workflow editor is a substantial ongoing commitment, independent of the specification and code generation work.

## Amendments

- **ADR-011** (2026-03-08, status: Proposed): Flowprint transitions from a
  specification compiler to an embeddable execution engine with GoRules ZEN.
  The amendments below reflect the intended future state once ADR-011 is
  implemented. See ADR-011 for the full rationale and current implementation
  status.
