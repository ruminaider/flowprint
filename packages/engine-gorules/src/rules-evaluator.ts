import { ZenEngine } from '@gorules/zen-engine'
import type { RulesDocument } from '@ruminaider/flowprint-engine-core'
import { translateToJDM } from './rules-translator.js'

/** Result of evaluating a rules document via GoRules ZEN */
export interface ZenRulesResult {
  hit_policy: string
  matched_count: number
  output: unknown
}

// Cache compiled decisions by document content hash
const decisionCache = new Map<string, ReturnType<ZenEngine['createDecision']>>()
let zenEngine: ZenEngine | null = null

function getEngine(): ZenEngine {
  if (!zenEngine) zenEngine = new ZenEngine()
  return zenEngine
}

/**
 * Evaluate a flowprint RulesDocument using GoRules ZEN engine.
 *
 * Translates the document to JDM format, compiles it into a ZEN decision,
 * and evaluates the input. Results are cached by document content for
 * repeated evaluations with different inputs.
 */
export async function evaluateRulesViaZen(
  doc: RulesDocument,
  input: Record<string, unknown>,
): Promise<ZenRulesResult> {
  const cacheKey = JSON.stringify(doc)
  let decision = decisionCache.get(cacheKey)

  if (!decision) {
    const jdm = translateToJDM(doc)
    decision = getEngine().createDecision(jdm)
    decisionCache.set(cacheKey, decision)
  }

  const response = await decision.evaluate(input)

  const isCollect = doc.hit_policy === 'collect' || doc.hit_policy === 'all'

  return {
    hit_policy: doc.hit_policy,
    matched_count: isCollect
      ? (Array.isArray(response.result) ? response.result.length : 0)
      : (isNonEmptyObject(response.result) ? 1 : 0),
    output: response.result,
  }
}

function isNonEmptyObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0
}

/**
 * Dispose the shared ZEN engine and clear the decision cache.
 * Call this during cleanup to free native WASM memory.
 */
export function disposeZenEngine(): void {
  zenEngine?.dispose()
  zenEngine = null
  decisionCache.clear()
}
