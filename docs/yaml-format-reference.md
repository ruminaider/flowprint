# Flowprint YAML Format Reference

Version: `flowprint/1.0`

File extension: `*.flowprint.yaml`

## Top-Level Structure

| Field         | Type                | Required | Description                                            |
| ------------- | ------------------- | -------- | ------------------------------------------------------ |
| `schema`      | string              | yes      | Schema version identifier. Must match `flowprint/X.Y`. |
| `name`        | string              | yes      | Machine-readable blueprint name.                       |
| `version`     | string              | yes      | Semantic version of this blueprint (e.g. `1.0.0`).     |
| `description` | string              | no       | Human-readable description.                            |
| `metadata`    | map\<string,string> | no       | Arbitrary key-value pairs (e.g. `owner`, `domain`).    |
| `lanes`       | map\<string,Lane>   | yes      | Swimlane definitions keyed by lane ID. At least one.   |
| `nodes`       | map\<string,Node>   | yes      | Node definitions keyed by node ID. At least one.       |

## Lanes

Each lane is keyed by its ID (e.g. `patient`, `backend`).

| Field        | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| `label`      | string  | yes      | Human-readable display name.                     |
| `visibility` | enum    | yes      | `external` (customer-facing) or `internal`.      |
| `order`      | integer | yes      | Display order. `0` = topmost lane. Must be >= 0. |

## Nodes

Every node is keyed by its ID (snake_case convention, e.g. `create_prescription`). All node types share a set of common fields, then have type-specific fields.

### Common Fields (all node types)

| Field          | Type                | Required | Description                                                 |
| -------------- | ------------------- | -------- | ----------------------------------------------------------- |
| `type`         | enum                | yes      | One of the 7 node types listed below.                       |
| `lane`         | string              | yes      | Lane ID this node belongs to.                               |
| `label`        | string              | yes      | Human-readable display name.                                |
| `description`  | string              | no       | Longer description of what this node does. Not on terminal. |
| `metadata`     | map\<string,string> | no       | Arbitrary key-value pairs.                                  |
| `entry_points` | EntryPoint[]        | no       | Code locations that implement this node. Not on terminal.   |

### EntryPoint

| Field    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `file`   | string | yes      | Relative file path from repository root. |
| `symbol` | string | yes      | Function or method name in the file.     |

### Node Type: `action`

A step that performs work and optionally continues to a next node.

| Field   | Type         | Required | Description                                |
| ------- | ------------ | -------- | ------------------------------------------ |
| `next`  | string       | no       | Node ID to transition to after completion. |
| `error` | ErrorHandler | no       | Error handling configuration.              |

### Node Type: `switch`

A decision point that routes to different nodes based on conditions.

| Field     | Type   | Required | Description                                                                 |
| --------- | ------ | -------- | --------------------------------------------------------------------------- |
| `cases`   | Case[] | yes      | At least one case. Each has `when` (condition) and `next` (target node ID). |
| `default` | string | no       | Node ID for the default/fallback branch.                                    |

Each **Case** object:

| Field  | Type   | Required | Description      |
| ------ | ------ | -------- | ---------------- |
| `when` | string | yes      | Condition label. |
| `next` | string | yes      | Target node ID.  |

### Node Type: `parallel`

Fans out to multiple branches and joins at a single node.

| Field           | Type     | Required | Description                                            |
| --------------- | -------- | -------- | ------------------------------------------------------ |
| `branches`      | string[] | yes      | At least one node ID to execute in parallel.           |
| `join`          | string   | yes      | Node ID where branches converge.                       |
| `join_strategy` | enum     | no       | `all_reached` or `await_all`. Controls join semantics. |

### Node Type: `wait`

Pauses execution until an event occurs or a timeout expires.

| Field          | Type   | Required | Description                                         |
| -------------- | ------ | -------- | --------------------------------------------------- |
| `event`        | string | yes      | Event name to wait for (e.g. `delivery.confirmed`). |
| `timeout`      | string | no       | Duration string (e.g. `7d`, `24h`, `30m`).          |
| `next`         | string | no       | Node ID to transition to when event is received.    |
| `timeout_next` | string | no       | Node ID to transition to when timeout expires.      |

### Node Type: `error`

Handles errors from upstream nodes (referenced via `error.catch`).

| Field  | Type   | Required | Description                              |
| ------ | ------ | -------- | ---------------------------------------- |
| `next` | string | no       | Node ID to transition to after handling. |

### Node Type: `terminal`

End state of the flow. Has no outgoing edges.

| Field     | Type | Required | Description             |
| --------- | ---- | -------- | ----------------------- |
| `outcome` | enum | yes      | `success` or `failure`. |

**Note:** Terminal nodes do not support `description` or `entry_points`.

### Node Type: `trigger`

Declares how a workflow starts. Trigger nodes have no incoming edges and don't execute logic — they define the workflow's activation mechanism. Only one trigger-type-specific configuration block (`schedule`, `webhook`, `event`, or `manual`) is allowed per trigger node, matching the `trigger_type` value.

| Field          | Type   | Required | Description                                              |
| -------------- | ------ | -------- | -------------------------------------------------------- |
| `trigger_type` | enum   | yes      | `schedule`, `webhook`, `event`, or `manual`.             |
| `next`         | string | yes      | Node ID that this trigger initiates.                     |
| `schedule`     | object | cond.    | Required when `trigger_type` is `schedule`.              |
| `webhook`      | object | cond.    | Required when `trigger_type` is `webhook`.               |
| `event`        | object | cond.    | Required when `trigger_type` is `event`.                 |
| `manual`       | object | cond.    | Required when `trigger_type` is `manual`.                |

**Schedule configuration:**

| Field      | Type   | Required | Description                      |
| ---------- | ------ | -------- | -------------------------------- |
| `cron`     | string | no       | Cron expression.                 |
| `timezone` | string | no       | IANA timezone (e.g. `UTC`).      |

**Webhook configuration:**

| Field     | Type                | Required | Description                                      |
| --------- | ------------------- | -------- | ------------------------------------------------ |
| `method`  | enum                | no       | `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`.      |
| `path`    | string              | no       | URL path.                                        |
| `headers` | map\<string,string> | no       | Required headers.                                |

**Event configuration:**

| Field    | Type   | Required | Description              |
| -------- | ------ | -------- | ------------------------ |
| `source` | string | no       | Event source identifier. |
| `type`   | string | no       | Event type.              |
| `filter` | string | no       | Filter expression.       |

**Manual configuration:**

| Field         | Type         | Required | Description     |
| ------------- | ------------ | -------- | --------------- |
| `form_fields` | FormField[]  | no       | Input fields.   |

Each **FormField**:

| Field      | Type    | Required | Description                               |
| ---------- | ------- | -------- | ----------------------------------------- |
| `name`     | string  | no       | Field name.                               |
| `type`     | enum    | no       | `string`, `number`, or `boolean`.         |
| `required` | boolean | no       | Whether the field is required.            |

## ErrorHandler

Configured on `action` nodes via the `error` field.

| Field   | Type   | Required | Description                                    |
| ------- | ------ | -------- | ---------------------------------------------- |
| `retry` | Retry  | no       | Retry configuration.                           |
| `catch` | string | no       | Node ID of the error handler node to route to. |

### Retry

| Field     | Type    | Required | Description                           |
| --------- | ------- | -------- | ------------------------------------- |
| `limit`   | integer | yes      | Maximum retry attempts. Must be >= 1. |
| `backoff` | enum    | no       | `linear` or `exponential`.            |

## Edges

Edges are implicit in node definitions -- they are not stored as a separate section. The graph is derived from these fields:

| Source Field   | Node Types                   | Edge Type  |
| -------------- | ---------------------------- | ---------- |
| `next`         | action, wait, error, trigger | `normal`   |
| `cases[].next` | switch                       | `normal`   |
| `default`      | switch                       | `default`  |
| `branches[]`   | parallel                     | `normal`   |
| `join`         | parallel                     | `normal`   |
| `timeout_next` | wait                         | `normal`   |
| `error.catch`  | action                       | `error`    |

## Structural Validation Rules

Beyond schema validation, the following structural rules are enforced:

1. **Dangling references**: All node ID references (`next`, `cases[].next`, `branches[]`, `join`, `error.catch`, `default`, `timeout_next`) must point to existing nodes.
2. **Lane references**: Every node's `lane` must match a key in the `lanes` map.
3. **Orphan detection**: Non-terminal nodes with no incoming and no outgoing edges are flagged. Terminal nodes with no incoming edges (in multi-node documents) are flagged.
4. **Trigger constraints**: Trigger nodes must have no incoming edges — they are always entry points of the workflow.

## Canonical Serialization

The `serialize()` function in `@ruminaider/flowprint-schema` is the only sanctioned way to produce `.flowprint.yaml` output.

### Key Ordering

**Top-level keys** (in order): `schema`, `name`, `version`, `description`, `metadata`, `lanes`, `nodes`

**Node keys** (in order): `type`, `lane`, `label`, `description`, `metadata`, `entry_points`, then type-specific fields in this order:

| Node Type  | Type-specific key order                                       |
| ---------- | ------------------------------------------------------------- |
| `action`   | `next`, `error`                                               |
| `switch`   | `cases`, `default`                                            |
| `parallel` | `branches`, `join`, `join_strategy`                           |
| `wait`     | `event`, `timeout`, `next`, `timeout_next`                    |
| `error`    | `next`                                                        |
| `terminal` | `outcome`                                                     |
| `trigger`  | `trigger_type`, `next`, `schedule`, `webhook`, `event`, `manual` |

### Formatting Rules

- 2-space indentation
- Block style for all objects and arrays
- Strings unquoted when valid YAML, quoted only when required (e.g. values that look like booleans or numbers)
- Single trailing newline at end of file

## Minimal Example

```yaml
schema: flowprint/1.0
name: minimal-example
version: 1.0.0
description: A minimal two-node blueprint
lanes:
  main:
    label: Main
    visibility: external
    order: 0
nodes:
  start:
    type: action
    lane: main
    label: Start
    entry_points:
      - file: src/main.py
        symbol: start
    next: done
  done:
    type: terminal
    lane: main
    label: Done
    outcome: success
```
