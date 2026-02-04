import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isWaitNode } from '@ruminaider/flowprint-schema'
import type { GeneratedFile } from './types.js'
import { FILE_HEADER } from './utils.js'

export function generateTypes(doc: FlowprintDocument): GeneratedFile {
  const lines: string[] = []

  // Workflow input type
  if (doc.workflow?.input_type) {
    const importPath = doc.workflow.input_type_import ?? './types'
    lines.push(`export type { ${doc.workflow.input_type} } from '${importPath}'`)
  }

  // Wait node event types
  const seenTypes = new Set<string>()
  for (const [, node] of Object.entries(doc.nodes)) {
    if (isWaitNode(node) && node.event_type && !seenTypes.has(node.event_type)) {
      seenTypes.add(node.event_type)
      const importPath = node.event_type_import ?? './types'
      lines.push(`export type { ${node.event_type} } from '${importPath}'`)
    }
  }

  const content = FILE_HEADER + lines.join('\n') + '\n'
  return { path: 'types.ts', content }
}
