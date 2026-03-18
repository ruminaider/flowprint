import Ajv from 'ajv'
import type {
  FlowprintDocument,
  MigrationRule,
  MigrationResult,
  MigrationChangelogEntry,
} from './types.js'
import { compareVersions } from './version.js'
import { applyTransform, describeTransform } from './transforms.js'
import {
  CURRENT_VERSION as DEFAULT_CURRENT_VERSION,
  migrationRules as defaultRules,
  schemaSnapshots as defaultSchemas,
} from './migrations/index.js'

export interface MigrateOptions {
  rules?: MigrationRule[]
  schemas?: Record<string, object>
  currentVersion?: string
}

/**
 * Migrate a Flowprint document from its current schema version to the target version.
 * Pure function — does not mutate the input document.
 */
export function migrate(doc: FlowprintDocument, options?: MigrateOptions): MigrationResult {
  const currentVersion = options?.currentVersion ?? DEFAULT_CURRENT_VERSION
  const rules = options?.rules ?? defaultRules
  const schemas = options?.schemas ?? defaultSchemas
  const docVersion = doc.schema

  // Already at current version
  if (docVersion === currentVersion) {
    return { status: 'current', doc }
  }

  // Document from the future
  if (compareVersions(docVersion, currentVersion) > 0) {
    return {
      status: 'future_version',
      doc,
      documentVersion: docVersion,
      currentToolVersion: currentVersion,
    }
  }

  // Build forward migration chain
  const path = buildMigrationPath(docVersion, currentVersion, rules)
  if (path.length === 0) {
    return {
      status: 'error',
      originalDoc: doc,
      error: {
        failedRule: `${docVersion} \u2192 ${currentVersion}`,
        reason: `No migration path found from ${docVersion} to ${currentVersion}`,
        stepIndex: -1,
      },
    }
  }

  // Deep clone to avoid mutating the original
  let current = structuredClone(doc)
  const entries: MigrationChangelogEntry[] = []

  for (let i = 0; i < path.length; i++) {
    const rule = path[i]!
    try {
      // Apply declarative transforms
      for (const transform of rule.transforms) {
        current = applyTransform(current, transform)
      }

      // Apply custom transform if present
      if (rule.custom) {
        current = rule.custom(current)
      }

      // Update schema version
      ;(current as unknown as Record<string, unknown>).schema = rule.to

      // Per-step validation against target version's schema snapshot
      const targetSchema = schemas[rule.to]
      if (targetSchema) {
        const ajv = new Ajv({ allErrors: true })
        const validate = ajv.compile(targetSchema)
        if (!validate(current)) {
          const messages =
            validate.errors?.map((e) => e.message).join('; ') ?? 'Unknown validation error'
          return {
            status: 'error',
            originalDoc: doc,
            error: {
              failedRule: `${rule.from} \u2192 ${rule.to}`,
              reason: `Per-step validation failed: ${messages}`,
              stepIndex: i,
            },
          }
        }
      }

      // Record changelog entry
      entries.push({
        version: rule.to,
        description: rule.description,
        required: rule.required,
        notable: rule.notable,
        transforms: rule.transforms.map(describeTransform),
      })
    } catch (err) {
      return {
        status: 'error',
        originalDoc: doc,
        error: {
          failedRule: `${rule.from} \u2192 ${rule.to}`,
          reason: err instanceof Error ? err.message : String(err),
          stepIndex: i,
        },
      }
    }
  }

  return {
    status: 'migrated',
    doc: current,
    changelog: { from: docVersion, to: currentVersion, entries },
    fromVersion: docVersion,
    toVersion: currentVersion,
  }
}

/**
 * Build an ordered chain of migration rules from `from` to `to`.
 * Returns empty array if no path exists or from === to.
 */
export function buildMigrationPath(
  from: string,
  to: string,
  rules: MigrationRule[],
): MigrationRule[] {
  if (from === to) return []
  const path: MigrationRule[] = []
  let current = from
  while (current !== to) {
    const next = rules.find((r) => r.from === current)
    if (!next) return []
    path.push(next)
    current = next.to
  }
  return path
}
