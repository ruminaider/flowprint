# Flowprint Rules Format Reference

Version: `flowprint-rules/1.0`

File extension: `*.rules.yaml`

Decision tables define condition-action rules for flowprint nodes. They are evaluated by the engine at runtime (`flowprint run`) and by the browser-safe evaluator in the editor. Rules files are referenced from blueprint nodes via the `rules` field.

## Top-Level Structure

| Field         | Type       | Required | Description                                                              |
| ------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `schema`      | string     | yes      | Must be `flowprint-rules/1.0`.                                           |
| `name`        | string     | yes      | Machine-readable name for this rules file.                               |
| `description` | string     | no       | Human-readable description of the decision table.                        |
| `hit_policy`  | enum       | yes      | How to handle multiple matching rules (see Hit Policies below).          |
| `inputs`      | InputDef[] | no       | Input definitions: simple dot-paths or labeled expressions.              |
| `rules`       | Rule[]     | yes      | Decision rules evaluated in order. At least one.                         |

## Inputs

Inputs declare the values evaluated by rule conditions. Two forms are supported:

### Simple dot-path

A string that resolves a nested property from the execution context via dot notation.

```yaml
inputs:
  - order.total_amount
  - customer.status
```

`order.total_amount` resolves to `context.order.total_amount`. Parts are split on `.` and traversed left-to-right. Returns `undefined` if the path does not exist.

### Labeled expression

An object with `label` and `expr` fields. The expression is evaluated via the Node.js `vm` module with a configurable timeout.

```yaml
inputs:
  - label: Is VIP
    expr: customer.loyalty_points > 1000
```

| Field   | Type   | Required | Description                          |
| ------- | ------ | -------- | ------------------------------------ |
| `label` | string | yes      | Human-readable label for this input. |
| `expr`  | string | yes      | Expression to compute the value.     |

**Note:** Labeled expressions are only supported in the Node.js evaluator (CLI, dev runner). The browser-safe evaluator in the editor skips them.

## Rules

Each rule has an optional `when` clause (conditions) and a required `then` clause (output).

| Field      | Type    | Required | Description                                                                  |
| ---------- | ------- | -------- | ---------------------------------------------------------------------------- |
| `when`     | object  | no       | Conditions keyed by input name. Omit for a wildcard rule that always matches. |
| `then`     | object  | yes      | Output values produced when this rule matches. Any shape.                    |
| `priority` | integer | no       | For `priority` hit policy only. Lower number = higher priority. Minimum: 0.  |

A rule matches when **all** conditions in `when` evaluate to true. Missing fields are treated as wildcards (match any value). A rule with no `when` clause always matches.

## Conditions

Condition values in `when` can be either a shorthand scalar or an operator object.

### Shorthand scalar

A plain value is equivalent to `{ eq: value }`:

```yaml
when:
  status: premium         # same as { eq: "premium" }
  is_active: true         # same as { eq: true }
  count: 5                # same as { eq: 5 }
  nullable_field: null    # same as { eq: null }
```

### Operator object

Multiple operators on the same field are ANDed together:

```yaml
when:
  order_total:
    gte: 100
    lte: 500
  status:
    in: [premium, enterprise]
```

## Operators

All operators use strict comparison (no type coercion).

| Operator  | Operand Type      | Description                               |
| --------- | ----------------- | ----------------------------------------- |
| `eq`      | any               | Value equals operand (`===`).             |
| `not_eq`  | any               | Value does not equal operand (`!==`).     |
| `gt`      | number            | Value is greater than operand.            |
| `gte`     | number            | Value is greater than or equal.           |
| `lt`      | number            | Value is less than operand.               |
| `lte`     | number            | Value is less than or equal.              |
| `in`      | array             | Value is one of the listed items.         |
| `not_in`  | array             | Value is not one of the listed items.     |
| `between` | [number, number]  | Value is between min and max (inclusive).  |

Numeric operators (`gt`, `gte`, `lt`, `lte`, `between`) require both value and operand to be `number`. If either is not a number, the condition evaluates to `false`.

## Hit Policies

The `hit_policy` field controls how the evaluator handles matching rules.

| Hit Policy | Output Type | Behavior                                                       |
| ---------- | ----------- | -------------------------------------------------------------- |
| `first`    | object      | Returns the `then` of the first matching rule. `{}` if none.   |
| `collect`  | object[]    | Returns the `then` of all matching rules as an array.          |
| `all`      | object[]    | Like `collect`, but throws an error if no rules match.         |
| `priority` | object      | Returns the `then` of the highest-priority match. `{}` if none. |

For `priority`, rules are sorted by their `priority` field (lower number = higher priority, default `0`), and the first in sorted order is returned.

## Blueprint Integration

Blueprint nodes reference rules files via the `rules` field, available on `action` and `switch` nodes:

```yaml
nodes:
  route_order:
    type: switch
    lane: backend
    label: Route Order
    rules:
      file: rules/order-routing.rules.yaml
      evaluator: builtin
```

| Field       | Type   | Required | Description                                                   |
| ----------- | ------ | -------- | ------------------------------------------------------------- |
| `file`      | string | yes      | Relative path to `.rules.yaml` file from the repository root. |
| `evaluator` | string | no       | Evaluator plugin name. Default: `builtin`.                    |

## Test Files

Test files validate rules against known inputs and expected outputs. They use the `flowprint-rules-test/1.0` schema.

File extension: `*.rules.test.yaml`

**Naming convention:** `<name>.rules.test.yaml` tests `<name>.rules.yaml` in the same directory. The `flowprint test` command auto-derives the rules file by replacing `.rules.test.yaml` with `.rules.yaml`.

### Top-Level Structure

| Field    | Type         | Required | Description                                  |
| -------- | ------------ | -------- | -------------------------------------------- |
| `schema` | string       | yes      | Must match `flowprint-rules-test/X.Y`.       |
| `tests`  | TestCase[]   | yes      | Array of test cases. At least one.           |

### Test Case

| Field                  | Type    | Required | Description                                |
| ---------------------- | ------- | -------- | ------------------------------------------ |
| `name`                 | string  | yes      | Human-readable test case name.             |
| `input`                | object  | yes      | Input object provided to the evaluator.    |
| `expected_output`      | object  | no       | Expected output to compare against actual. |
| `expected_matched_count` | integer | no     | Expected number of matched rules.          |

A test passes when all specified expectations are met. Comparison uses JSON stringification.

### Running Tests

```sh
flowprint test                              # runs **/*.rules.test.yaml
flowprint test "src/**/*.rules.test.yaml"   # custom glob
```

Exit codes: `0` all passed, `1` failures, `2` file/parse error.

## Examples

### Discount rules (`first` hit policy)

```yaml
# order-discount.rules.yaml
schema: flowprint-rules/1.0
name: order-discount
description: Discount rules for order processing
hit_policy: first
inputs:
  - order_total
rules:
  - when:
      order_total:
        gte: 200
    then:
      discount: 25

  - when:
      order_total:
        gte: 100
    then:
      discount: 10

  - then:
      discount: 0
```

```yaml
# order-discount.rules.test.yaml
schema: flowprint-rules-test/1.0
tests:
  - name: large order gets 25% discount
    input:
      order_total: 250
    expected_output:
      discount: 25

  - name: medium order gets 10% discount
    input:
      order_total: 150
    expected_output:
      discount: 10

  - name: small order gets no discount
    input:
      order_total: 50
    expected_output:
      discount: 0
```

### Order routing (`first` hit policy with `in` operator)

```yaml
schema: flowprint-rules/1.0
name: order_routing
hit_policy: first
inputs:
  - order_type
rules:
  - when:
      order_type:
        in: [test, expanded_test]
    then:
      next: check_bulk_order

  - when:
      order_type: prescription_treatment
    then:
      next: resolve_prescriptions

  - when: {}
    then:
      next: handle_unknown
```

### Fee collection (`collect` hit policy)

```yaml
schema: flowprint-rules/1.0
name: applicable_fees
hit_policy: collect
inputs:
  - order.amount
  - customer.region
rules:
  - when:
      order.amount:
        gte: 500
    then:
      fee_type: premium_processing
      amount: 50

  - when:
      customer.region: international
    then:
      fee_type: international_surcharge
      amount: 25
```

With input `{ order: { amount: 600 }, customer: { region: "international" } }`, both rules match and the output is an array of both `then` objects.

### Escalation (`priority` hit policy)

```yaml
schema: flowprint-rules/1.0
name: escalation
hit_policy: priority
rules:
  - when:
      severity: critical
    then:
      route: executive_team
    priority: 0

  - when:
      severity: high
    then:
      route: senior_team
    priority: 1

  - when: {}
    then:
      route: general_queue
    priority: 10
```

With input `{ severity: "critical" }`, both the `critical` rule and the wildcard match, but `priority: 0` wins.
