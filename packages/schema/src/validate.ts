import Ajv from 'ajv'
import { parse } from 'yaml'
import schema from '../flowprint.schema.json' with { type: 'json' }
import { validateStructure } from './structural.js'
import type { ValidationResult, ValidationError } from './types.js'

const ajv = new Ajv({ allErrors: true })
const schemaValidator = ajv.compile(schema)

/**
 * Supported schema versions. Documents with unsupported versions are rejected.
 */
export const SUPPORTED_VERSIONS = ['flowprint/1.0'] as const

/**
 * All valid node types.
 */
export const NODE_TYPES = ['action', 'switch', 'parallel', 'wait', 'error', 'terminal', 'trigger'] as const

/**
 * Validate a parsed Flowprint document against the JSON Schema and
 * structural rules. Runs schema validation first; if the document is
 * structurally valid enough to extract nodes, also runs structural
 * validation (dangling references, invalid lanes, orphan nodes).
 *
 * @param doc - The parsed document (unknown type — handles malformed input)
 * @returns Validation result with all errors found
 */
export function validate(doc: unknown): ValidationResult {
  const errors: ValidationError[] = []

  // Schema validation (snapshot errors immediately — ajv mutates .errors on each call)
  const valid = schemaValidator(doc)
  const schemaErrors = schemaValidator.errors ? [...schemaValidator.errors] : []
  if (!valid) {
    for (const err of schemaErrors) {
      errors.push({
        path: err.instancePath || '/',
        message: formatAjvError(err),
        severity: 'error',
      })
    }
  }

  // Check supported schema version (if the field exists and passed schema validation)
  if (
    typeof doc === 'object' &&
    doc !== null &&
    'schema' in doc &&
    typeof (doc as Record<string, unknown>).schema === 'string'
  ) {
    const schemaVersion = (doc as Record<string, unknown>).schema as string
    if (!SUPPORTED_VERSIONS.includes(schemaVersion as (typeof SUPPORTED_VERSIONS)[number])) {
      errors.push({
        path: '/schema',
        message: `Unsupported schema version "${schemaVersion}". Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
        severity: 'error',
      })
    }
  }

  // If schema validation passed (document is well-formed), run structural validation
  if (valid) {
    const structuralErrors = validateStructure(doc as Record<string, unknown>)
    errors.push(...structuralErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Parse a YAML string and validate the resulting document.
 * Reports YAML parse errors as validation errors with severity "error".
 *
 * @param yamlString - Raw YAML content to parse and validate
 * @returns Validation result
 */
export function validateYaml(yamlString: string): ValidationResult {
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

  return validate(doc)
}

/**
 * Format an ajv error into a human-readable message.
 */
function formatAjvError(err: {
  keyword: string
  message?: string
  params?: Record<string, unknown>
  instancePath?: string
  schemaPath?: string
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
    case 'pattern':
      return `String does not match pattern: ${String(err.params?.pattern)}`
    case 'type':
      return `Invalid type: expected ${String(err.params?.type)}`
    case 'minLength':
      return 'String must not be empty'
    case 'minProperties':
      return 'Object must not be empty'
    case 'minimum':
      return `Value must be >= ${String(err.params?.limit)}`
    case 'minItems':
      return `Array must have at least ${String(err.params?.limit)} item(s)`
    case 'oneOf':
      return 'Node must match exactly one node type (action, switch, parallel, wait, error, terminal, trigger)'
    default:
      return base
  }
}
