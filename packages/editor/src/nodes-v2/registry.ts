import type { NodeSpec } from './types'

const specs = new Map<string, NodeSpec>()

export function registerNodeSpec(spec: NodeSpec): void {
  specs.set(spec.type, spec)
}

export function getNodeSpec(type: string): NodeSpec | undefined {
  return specs.get(type)
}

export function getAllNodeSpecs(): NodeSpec[] {
  return Array.from(specs.values())
}

export function getNodeSpecOrThrow(type: string): NodeSpec {
  const spec = specs.get(type)
  if (!spec) {
    throw new Error(`No node spec registered for type: ${type}`)
  }
  return spec
}
