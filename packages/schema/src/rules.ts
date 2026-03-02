import Ajv from 'ajv'
import { parse } from 'yaml'
import rulesSchema from '../flowprint-rules.schema.json' with { type: 'json' }
import rulesTestSchema from '../flowprint-rules-test.schema.json' with { type: 'json' }
import type { ValidationResult, ValidationError } from './types.js'

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
const rulesValidator = ajv.compile(rulesSchema)
const rulesTestValidator = ajv.compile(rulesTestSchema)

/**
 * Supported rules schema versions.
 */
export const SUPPORTED_RULES_VERSIONS = ['flowprint-rules/1.0'] as const

/**
 * Supported rules test schema versions.
 */
export const SUPPORTED_RULES_TEST_VERSIONS = ['flowprint-rules-test/1.0'] as const

/**
 * All valid hit policies.
 */
export const HIT_POLICIES = ['first', 'collect', 'all', 'priority'] as const

/**
 * All valid condition operators.
 */
export const OPERATORS = [
  'eq',
  'not_eq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'between',
] as const

/**
 * Validate a parsed rules document against the rules JSON Schema
 * and structural constraints.
 *
 * @param doc - The parsed rules document
 * @returns Validation result with all errors found
 */
export function validateRules(doc: unknown): ValidationResult {
  const errors: ValidationError[] = []

  const valid = rulesValidator(doc)
  const schemaErrors = rulesValidator.errors ? [...rulesValidator.errors] : []
  if (!valid) {
    for (const err of schemaErrors) {
      errors.push({
        path: err.instancePath || '/',
        message: formatRulesError(err),
        severity: 'error',
      })
    }
  }

  // Structural validation (only if schema is valid)
  if (valid) {
    const rules = doc as Record<string, unknown>
    validateRulesStructure(rules, errors)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Parse a YAML string and validate the resulting rules document.
 *
 * @param yamlString - Raw YAML content to parse and validate
 * @returns Validation result
 */
export function validateRulesYaml(yamlString: string): ValidationResult {
  let doc: unknown
  try {
    doc = parse(yamlString)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse YAML'
    return {
      valid: false,
      errors: [
        {
          path: '/',
          message: `YAML parse error: ${message}`,
          severity: 'error',
        },
      ],
    }
  }

  return validateRules(doc)
}

/**
 * Validate a parsed rules test document against the rules test JSON Schema.
 *
 * @param doc - The parsed rules test document
 * @returns Validation result with all errors found
 */
export function validateRulesTest(doc: unknown): ValidationResult {
  const errors: ValidationError[] = []

  const valid = rulesTestValidator(doc)
  const schemaErrors = rulesTestValidator.errors ? [...rulesTestValidator.errors] : []
  if (!valid) {
    for (const err of schemaErrors) {
      errors.push({
        path: err.instancePath || '/',
        message: formatRulesError(err),
        severity: 'error',
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Parse a YAML string and validate the resulting rules test document.
 *
 * @param yamlString - Raw YAML content to parse and validate
 * @returns Validation result
 */
export function validateRulesTestYaml(yamlString: string): ValidationResult {
  let doc: unknown
  try {
    doc = parse(yamlString)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to parse YAML'
    return {
      valid: false,
      errors: [
        {
          path: '/',
          message: `YAML parse error: ${message}`,
          severity: 'error',
        },
      ],
    }
  }

  return validateRulesTest(doc)
}

/**
 * Structural validation for rules documents.
 */
function validateRulesStructure(doc: Record<string, unknown>, errors: ValidationError[]): void {
  const hitPolicy = doc.hit_policy as string
  const rules = doc.rules as Record<string, unknown>[]
  const inputs = doc.inputs as unknown[] | undefined

  // Collect declared input names for reference checking
  const inputNames = new Set<string>()
  if (inputs) {
    for (const input of inputs) {
      if (typeof input === 'string') {
        inputNames.add(input)
      } else if (typeof input === 'object' && input !== null) {
        const labeled = input as Record<string, unknown>
        if (typeof labeled.label === 'string') {
          inputNames.add(labeled.label)
        }
      }
    }
  }

  // Validate priority field usage
  if (hitPolicy === 'priority') {
    for (const [i, rule] of rules.entries()) {
      if (rule.priority === undefined) {
        errors.push({
          path: `/rules/${String(i)}`,
          message: 'Rule must have a "priority" field when hit_policy is "priority"',
          severity: 'warning',
        })
      }
    }
  }

  // Validate when-clause input references against declared inputs (if inputs declared)
  if (inputs && inputs.length > 0) {
    for (const [i, rule] of rules.entries()) {
      const when = rule.when as Record<string, unknown> | undefined
      if (when) {
        for (const field of Object.keys(when)) {
          if (!inputNames.has(field)) {
            errors.push({
              path: `/rules/${String(i)}/when/${field}`,
              message: `Condition references undeclared input "${field}". Declared inputs: ${[...inputNames].join(', ')}`,
              severity: 'warning',
            })
          }
        }
      }
    }
  }
}

/**
 * Format an ajv error for rules documents.
 */
function formatRulesError(err: {
  keyword: string
  message?: string
  params?: Record<string, unknown>
}): string {
  const base = err.message ?? 'Unknown validation error'

  switch (err.keyword) {
    case 'required': {
      const prop = err.params?.missingProperty
      return `Missing required property: ${String(prop)}`
    }
    case 'additionalProperties': {
      const prop = err.params?.additionalProperty
      return `Unexpected property: ${String(prop)}`
    }
    case 'enum': {
      const allowed = err.params?.allowedValues
      return `Invalid value. Allowed values: ${JSON.stringify(allowed)}`
    }
    case 'const': {
      const expected = err.params?.allowedValue
      return `Expected value: ${JSON.stringify(expected)}`
    }
    case 'minLength':
      return 'String must not be empty'
    case 'minItems':
      return `Array must have at least ${String(err.params?.limit)} item(s)`
    case 'minProperties':
      return 'Object must not be empty'
    case 'oneOf':
      return 'Must match exactly one input type: string (dot-path) or { label, expr }'
    default:
      return base
  }
}
