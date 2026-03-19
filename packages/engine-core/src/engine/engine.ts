import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { validate, isActionNode, isSwitchNode, isErrorNode } from '@ruminaider/flowprint-schema'
import type {
  FlowprintDocument,
  ActionNode,
  SwitchNode,
  ErrorNode,
} from '@ruminaider/flowprint-schema'
import { loadEntryPoint } from '../runner/loader.js'
import { loadRulesFile } from '../rules/evaluator.js'
import { CompiledFlow } from './compiled-flow.js'
import type { HandlerFn, EngineOptions, ResolvedHandler, RegisterOptions } from './types.js'

/**
 * Main engine class. Provides register → load → execute lifecycle.
 *
 * Handlers registered via `register()` are captured into an immutable
 * snapshot at `load()` time, so mutating the engine after load()
 * does not affect existing CompiledFlow instances.
 */
export class FlowprintEngine {
  private handlers = new Map<string, { fn: HandlerFn; override: boolean }>()
  private options: EngineOptions

  constructor(options?: EngineOptions) {
    this.options = options ?? {}
  }

  /**
   * Register a handler function for a node. Must be called before load().
   * Returns `this` for chaining.
   */
  register(nodeId: string, handler: HandlerFn, opts?: RegisterOptions): this {
    this.handlers.set(nodeId, { fn: handler, override: opts?.override ?? false })
    return this
  }

  /**
   * Load a flowprint YAML file or content string. Returns an immutable CompiledFlow.
   *
   * Detection heuristic: if the string starts with `schema:` or contains newlines,
   * it's treated as YAML content. Otherwise, it's treated as a file path.
   */
  async load(yamlPathOrContent: string): Promise<CompiledFlow> {
    // 1. Parse YAML
    const yamlContent = this.resolveYamlContent(yamlPathOrContent)
    const doc = this.parseAndValidate(yamlContent)

    // 2. Resolve handlers for each node
    const projectRoot = this.options.projectRoot ?? process.cwd()
    const resolvedHandlers = await this.resolveHandlers(doc, projectRoot)

    // 3. Return immutable CompiledFlow
    return new CompiledFlow(doc, resolvedHandlers, { ...this.options })
  }

  /**
   * Resolve YAML content from a file path or inline content string.
   */
  private resolveYamlContent(yamlPathOrContent: string): string {
    const isContent = yamlPathOrContent.startsWith('schema:') || yamlPathOrContent.includes('\n')

    if (isContent) {
      return yamlPathOrContent
    }

    const filePath = resolve(this.options.projectRoot ?? process.cwd(), yamlPathOrContent)
    try {
      return readFileSync(filePath, 'utf-8')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to load flowprint file "${yamlPathOrContent}": ${message}`)
    }
  }

  /**
   * Parse YAML and validate against schema + structural rules.
   */
  private parseAndValidate(yamlContent: string): FlowprintDocument {
    let doc: unknown
    try {
      doc = parse(yamlContent, { maxAliasCount: 100, schema: 'core' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`YAML parse error: ${message}`)
    }

    const result = validate(doc)
    if (!result.valid) {
      const errorMessages = result.errors
        .filter((e) => e.severity === 'error')
        .map((e) => `  ${e.path}: ${e.message}`)
        .join('\n')
      throw new Error(`Flowprint validation failed:\n${errorMessages}`)
    }

    return doc as FlowprintDocument
  }

  /**
   * Pre-resolve the handler for each node in the document.
   */
  private async resolveHandlers(
    doc: FlowprintDocument,
    projectRoot: string,
  ): Promise<ReadonlyMap<string, ResolvedHandler>> {
    const resolved = new Map<string, ResolvedHandler>()

    for (const [nodeId, node] of Object.entries(doc.nodes)) {
      const registration = this.handlers.get(nodeId)

      if (registration) {
        // Registered handler takes priority
        if (isActionNode(node)) {
          const actionNode = node as ActionNode
          if (!registration.override) {
            if (actionNode.expressions) {
              console.debug(
                `[flowprint] Registered handler for "${nodeId}" overrides expressions field`,
              )
            } else if (actionNode.rules) {
              console.debug(`[flowprint] Registered handler for "${nodeId}" overrides rules field`)
            } else if (actionNode.entry_points && actionNode.entry_points.length > 0) {
              console.debug(
                `[flowprint] Registered handler for "${nodeId}" overrides entry_points field`,
              )
            }
          }
        }
        resolved.set(nodeId, { type: 'registered', fn: registration.fn })
        continue
      }

      if (isActionNode(node)) {
        const actionNode = node as ActionNode
        const handler = await this.resolveActionHandler(nodeId, actionNode, projectRoot)
        resolved.set(nodeId, handler)
      } else if (isSwitchNode(node)) {
        const switchNode = node as SwitchNode
        if (switchNode.rules) {
          // Rules-driven switch — still handled natively by the compiled flow
          resolved.set(nodeId, { type: 'native' })
        } else {
          resolved.set(nodeId, { type: 'native' })
        }
      } else if (isErrorNode(node)) {
        const errorNode = node as ErrorNode
        if (errorNode.entry_points && errorNode.entry_points.length > 0) {
          const entryPoint = errorNode.entry_points[0]!
          const fn = await loadEntryPoint(entryPoint, projectRoot)
          resolved.set(nodeId, {
            type: 'entry_point',
            fn: async (ctx) => fn(ctx.input),
          })
        } else {
          resolved.set(nodeId, { type: 'native' })
        }
      } else {
        // terminal, trigger, wait, parallel — all native
        resolved.set(nodeId, { type: 'native' })
      }
    }

    return resolved
  }

  /**
   * Resolve the handler for an action node (non-registered).
   */
  private async resolveActionHandler(
    nodeId: string,
    node: ActionNode,
    projectRoot: string,
  ): Promise<ResolvedHandler> {
    // Expressions field
    if (node.expressions) {
      return { type: 'expressions', exprs: node.expressions }
    }

    // Rules field
    if (node.rules) {
      // Validate the rules file exists and is valid at load() time
      loadRulesFile(node.rules.file, projectRoot)
      return { type: 'rules', rulesFile: node.rules.file }
    }

    // Entry points
    if (node.entry_points && node.entry_points.length > 0) {
      const entryPoint = node.entry_points[0]!
      const fn = await loadEntryPoint(entryPoint, projectRoot)
      return {
        type: 'entry_point',
        fn: async (ctx) => {
          // Evaluate input expressions if present
          if (node.inputs) {
            const { evaluateExpression } = await import('../runner/evaluator.js')
            const legacyCtx = buildLegacyContext(ctx)
            const evaluated: Record<string, unknown> = {}
            for (const [key, expr] of Object.entries(node.inputs)) {
              evaluated[key] = evaluateExpression(expr, legacyCtx)
            }
            return fn(evaluated)
          }
          return fn(ctx.input)
        },
      }
    }

    throw new Error(`No handler for node "${nodeId}"`)
  }
}

/**
 * Build an old-style ExecutionContext (Map-based) from the walker context.
 * The evaluator and rules engine expect `{ input, results: Map }`.
 */
function buildLegacyContext(ctx: import('../walker/types.js').ExecutionContext): {
  input: unknown
  results: Map<string, unknown>
} {
  const results = new Map<string, unknown>()
  for (const [key, value] of Object.entries(ctx.state)) {
    results.set(key, value)
  }
  return { input: ctx.input, results }
}

export { buildLegacyContext }
