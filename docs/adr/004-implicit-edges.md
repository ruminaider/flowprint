# ADR-004: Implicit Edges via Node Fields

## Status

Accepted

## Date

2025-01-15

## Context

Graph-based workflow formats typically represent structure using two parallel collections: a list of nodes and a list of edges. Each edge is an independent object referencing a source node and a target node by ID. This is the approach used by React Flow internally, by BPMN's sequence flows, and by most graph databases.

While general-purpose graph formats benefit from separating nodes and edges, service blueprints have a characteristic that makes this separation costly: the vast majority of transitions are sequential. An action leads to the next action. A switch routes to one of its cases. A parallel fork defines its branches. In practice, the topology is defined by the nodes themselves, and a separate edge array largely duplicates information already present in node fields.

Maintaining two parallel representations of the same topology creates synchronization challenges. Renaming or deleting a node requires updating both the node map and any edges referencing it. Validation must cross-check that every edge references existing nodes and that node fields agree with their edges. In visual editors, this dual representation is a common source of bugs where the graph state and the edge list fall out of sync.

## Decision

Edges in Flowprint blueprints are implicit — derived from fields on the nodes themselves rather than stored in a separate collection:

1. **`next` field** on action, wait, and error nodes points to the ID of the following node.
2. **`cases` array** on switch nodes contains objects with a `condition` and a `next` target.
3. **`branches` array** on parallel nodes lists the entry-point node IDs for each concurrent branch.
4. **`catch` handlers** on error nodes reference handler entry-point nodes.
5. **terminal nodes** have no outgoing references, marking the end of a flow path.

The editor's React Flow layer derives its internal edge objects from these node fields at render time. When the user drags a connection in the editor, the change is written back to the source node's field, not to a separate edge store.

## Consequences

### Positive

- Each node is self-contained: reading a single node tells you where execution goes next, without cross-referencing an edge table.
- Validation is local to the node. Checking that a node's `next` reference points to an existing node is simpler than validating a separate edge array for dangling references, duplicate edges, and bidirectional consistency.
- The YAML representation is more compact and readable. A sequence of three actions reads naturally: each action's `next` field points to the following one.
- Refactoring operations (reordering nodes, extracting sub-flows) only modify node objects, reducing the surface area for bugs.
- Deleting a node automatically removes its incoming edges — any node whose `next` pointed to the deleted node can be updated in one place.

### Negative

- Edges with independent metadata (labels, conditions, animation styles) must be encoded in the source node's fields rather than on a standalone edge object. This works for our current needs but could become awkward if edge-level metadata grows.
- The editor must derive React Flow edge objects on every render, adding a transformation step. In practice this is a cheap map operation over nodes, but it is an abstraction gap between our data model and React Flow's expected format.
- Visualizing the full graph topology requires iterating all nodes and collecting their outgoing references, whereas a flat edge list provides this directly.
- Patterns like "multiple edges from the same port" or "edges between non-adjacent lanes" require special handling in node fields, since each field type (next, cases, branches) has its own structure.
