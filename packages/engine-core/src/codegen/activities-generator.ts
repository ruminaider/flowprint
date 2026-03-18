import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { isActionNode, isErrorNode, isSwitchNode } from '@ruminaider/flowprint-schema'
import type { GeneratedFile } from './types.js'
import { FILE_HEADER, camelCase, pascalCase } from './utils.js'

export function generateActivities(doc: FlowprintDocument): GeneratedFile {
  const lines: string[] = []
  let needsRulesImport = false

  for (const [id, node] of Object.entries(doc.nodes)) {
    // Rules-driven nodes generate evaluator activities
    if ((isActionNode(node) || isSwitchNode(node)) && node.rules?.file) {
      needsRulesImport = true
      const fnName = `evaluate${pascalCase(id)}Rules`
      lines.push(`// ${node.label} (rules-driven)`)
      lines.push(`export async function ${fnName}(input: unknown) {`)
      lines.push(`  const doc = loadRulesFile('${node.rules.file}', process.cwd())`)
      lines.push(`  return evaluateRules(doc, { input, results: new Map() })`)
      lines.push(`}`)
      lines.push('')
      continue
    }

    if (!isActionNode(node) && !isErrorNode(node)) continue
    if (!node.entry_points || node.entry_points.length === 0) continue

    const varName = camelCase(id)
    const ep = node.entry_points[0]
    if (!ep) continue

    if (isActionNode(node) && node.inputs && Object.keys(node.inputs).length > 0) {
      // Generate wrapper that destructures named inputs
      const inputKeys = Object.keys(node.inputs)
      const params = inputKeys.join(', ')
      lines.push(`// ${node.label}`)
      lines.push(`import { ${ep.symbol} as _${varName} } from '${ep.file}'`)
      lines.push(
        `export async function ${varName}(args: { ${inputKeys.map((k) => `${k}: unknown`).join('; ')} }) {`,
      )
      lines.push(`  const { ${params} } = args`)
      lines.push(`  return _${varName}(${params})`)
      lines.push(`}`)
    } else {
      // Simple re-export
      lines.push(`export { ${ep.symbol} as ${varName} } from '${ep.file}'`)
    }

    // Compensation
    if (isActionNode(node) && node.compensation) {
      const comp = node.compensation
      lines.push(`export { ${comp.symbol} as ${varName}Compensate } from '${comp.file}'`)
    }

    lines.push('')
  }

  // Add rules import at the top if any rules-driven activities were generated
  const importLines: string[] = []
  if (needsRulesImport) {
    importLines.push(`import { loadRulesFile, evaluateRules } from '@ruminaider/flowprint-engine'`)
    importLines.push('')
  }

  const content = FILE_HEADER + importLines.join('\n') + lines.join('\n')
  return { path: 'activities.ts', content }
}
