import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export type LintSeverity = 'error' | 'warn' | 'off'

export interface LintResult {
  rule: string
  path: string
  message: string
}

export interface LintDiagnostic extends LintResult {
  severity: LintSeverity
}

export interface LintRule {
  name: string
  check(doc: FlowprintDocument): LintResult[]
}
