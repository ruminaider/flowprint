import type { MigrationRule } from '../types.js'
import schema_1_0 from './schemas/1.0.json' with { type: 'json' }

/** The current schema version this tool writes. */
export const CURRENT_VERSION = 'flowprint/1.0'

/** Ordered list of all migration rules. Empty until the first schema bump. */
export const migrationRules: MigrationRule[] = []

/** Immutable JSON Schema snapshots for per-step validation. Keyed by version string. */
export const schemaSnapshots: Record<string, object> = {
  'flowprint/1.0': schema_1_0 as object,
}
