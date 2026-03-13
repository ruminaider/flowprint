# Why Flowprint?

## The gap

Two worlds exist in service development, and nothing connects them.

On one side are **visual service design tools**. Teams sketch service blueprints in
Miro, Figma, or dedicated CX platforms -- mapping customer journeys, frontstage
interactions, backstage processes, and support systems. The output is a visual
artifact: an image, a PDF, a shared board. It communicates intent beautifully to
stakeholders, but a CI pipeline cannot validate it, a linter cannot check it, and
a code generator cannot scaffold from it.

On the other side are **workflow execution engines**. Engineers write durable
workflows in code or DSLs -- defining activities, retries, timeouts, and
compensation logic. The input is source code or a proprietary format. It runs
reliably in production, but there is no visual design surface for the service
designers who originally mapped the experience.

The diagram drifts from reality the moment the first commit lands. The blueprint
becomes a historical snapshot, not a living artifact. Teams re-draw it quarterly
(if at all), and the gap between what was designed and what was built only grows.

## The landscape

Several categories of tools each do their job well. Flowprint does not replace
any of them -- it occupies a different position in the workflow.

### Service design tools

**Smaply, UXPressia, Miro/Figma templates** and similar platforms are excellent
for collaborative visual design. They give CX teams and stakeholders a shared
language for mapping customer journeys and service blueprints. Their strength is
in communication: producing visual artifacts that align cross-functional teams
around a service experience.

Output: images, PDFs, interactive boards.

### Workflow engines

**Temporal, AWS Step Functions, Camunda, Apache Airflow** and others are
excellent for durable execution. They handle fault tolerance, retries, distributed
orchestration, and long-running processes. Their strength is in reliability:
ensuring that complex workflows run correctly in production, even when things fail.

Input: application code, DSLs, or proprietary configuration formats.

### Diagram-as-code tools

**Mermaid, PlantUML, Structurizr** and others are excellent for
documentation-as-code. They give developers a familiar text-based workflow for
producing architecture and sequence diagrams that live alongside code. Their
strength is in developer ergonomics: version-controlled diagrams that render
automatically in Markdown viewers and CI pipelines.

Output: rendered diagrams from text DSLs.

## Where Flowprint fits

Flowprint is an open-source bridge between service design and service
implementation. It introduces a structured, machine-readable format for service
blueprints -- `.flowprint.yaml` -- and provides tooling to edit, validate,
execute, test, and generate code from that format.

### Schema-first

A `.flowprint.yaml` file is not a picture. It is a structured document with a
published JSON Schema. It can be validated, linted, diffed, and processed by any
tool that reads YAML. The schema defines seven node types that map directly to
service blueprint semantics: customer actions, frontstage interactions, backstage
processes, support processes, physical evidence, and external systems.

### Git-native

Blueprints are plain text files that live alongside application code. They go
through pull requests. Diffs are meaningful because a canonical serializer
produces deterministic output. CI pipelines can validate blueprints on every
push -- checking schema conformance, required fields, or custom rules.

### Code generation

`flowprint generate` reads a `.flowprint.yaml` file and produces Temporal
workflow scaffolding: workflow definitions, activity stubs, worker configuration,
and type definitions. The generated code is a starting point, not a runtime
dependency. Teams own and extend the output.

### Execution

`flowprint run` executes blueprints locally using the dev runner. The graph
walker processes nodes in dependency order, evaluates switch conditions via
sandboxed expressions, runs parallel branches concurrently, and produces an
execution trace showing the path taken and output at each step. Entry point
functions are loaded dynamically from the codebase.

### Decision tables

Business rules are declared in `.rules.yaml` files alongside blueprints.
Decision tables use structured conditions (operators, hit policies) that are
readable by non-developers and testable independently via `flowprint test`. The
browser-safe evaluator provides instant feedback in the editor.

### Embeddable

`<FlowprintEditor>` is an npm package. It can be embedded in internal tools,
developer portals, or documentation sites. The editor is a React component with
a focused API, not a standalone application that requires its own infrastructure.

### Focused vocabulary

Seven typed node types cover service blueprint semantics without the complexity
of full BPMN notation. Edges are implicit (derived from node relationships), and
the canonical serializer ensures that the YAML output stays clean and
diff-friendly. The goal is a format that service designers can read and engineers
can generate from -- not a general-purpose diagramming language.

## Who it's for

Flowprint is for teams that want their service blueprints to be **living
artifacts** in their engineering workflow -- not static diagrams that drift from
reality after the first sprint.

If your team draws service blueprints and then separately implements them in
code, Flowprint gives you a single artifact that serves both purposes: a visual
blueprint that is also a validated, version-controlled, code-generating source of
truth.
