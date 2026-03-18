import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isActionNode, isErrorNode, isWaitNode } from '@ruminaider/flowprint-schema'
import type { GeneratedFile } from './types.js'
import { FILE_HEADER, camelCase } from './utils.js'

export function generateTestFixtures(doc: FlowprintDocument): GeneratedFile[] {
  const files: GeneratedFile[] = []

  files.push(generateActivityMocks(doc))
  files.push(generateSampleInput(doc))

  const signalFixtures = generateSignalFixtures(doc)
  if (signalFixtures) {
    files.push(signalFixtures)
  }

  return files
}

function generateActivityMocks(doc: FlowprintDocument): GeneratedFile {
  const lines: string[] = []

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (!isActionNode(node) && !isErrorNode(node)) continue
    if (!node.entry_points || node.entry_points.length === 0) continue

    const varName = camelCase(id)
    lines.push(`export function ${varName}() {`)
    lines.push(`  return { ${varName}: 'mock_result' }`)
    lines.push(`}`)
    lines.push('')

    // Compensation mock
    if (isActionNode(node) && node.compensation) {
      lines.push(`export function ${varName}Compensate() {`)
      lines.push(`  return { compensated: true }`)
      lines.push(`}`)
      lines.push('')
    }
  }

  const content = FILE_HEADER + lines.join('\n')
  return { path: 'activity-mocks.ts', content }
}

function generateSampleInput(doc: FlowprintDocument): GeneratedFile {
  const lines: string[] = []

  const typeName = doc.workflow?.input_type ?? 'unknown'

  lines.push(`// Sample input for ${doc.name} workflow`)
  lines.push(`export const sampleInput: ${typeName} = {} as ${typeName}`)
  lines.push('')

  const content = FILE_HEADER + lines.join('\n')
  return { path: 'test-fixtures.ts', content }
}

function generateSignalFixtures(doc: FlowprintDocument): GeneratedFile | null {
  const waitNodes: { id: string; node: import('@ruminaider/flowprint-schema').WaitNode }[] = []

  for (const [id, node] of Object.entries(doc.nodes)) {
    if (isWaitNode(node) && node.event_type) {
      waitNodes.push({ id, node })
    }
  }

  if (waitNodes.length === 0) {
    return null
  }

  const lines: string[] = []

  for (const { id, node } of waitNodes) {
    const varName = camelCase(id)
    const typeName = node.event_type ?? 'unknown'

    lines.push(`// Signal fixture for ${node.event}`)
    lines.push(`export const ${varName}Signal: ${typeName} = {} as ${typeName}`)
    lines.push('')
  }

  const content = FILE_HEADER + lines.join('\n')
  return { path: 'signal-fixtures.ts', content }
}
