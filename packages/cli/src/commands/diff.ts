import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { parse } from 'yaml'
import type { FlowprintDocument, Node, Lane } from '@ruminaider/flowprint-schema'

export const diffCommand = new Command('diff')
  .description('Show structural differences between two .flowprint.yaml files')
  .argument('<file1>', 'First .flowprint.yaml file')
  .argument('<file2>', 'Second .flowprint.yaml file')
  .addHelpText('after', '\nExit codes:\n  0  Always (informational command)')
  .action((file1: string, file2: string) => {
    let doc1: FlowprintDocument
    let doc2: FlowprintDocument

    try {
      doc1 = parse(readFileSync(resolve(file1), 'utf-8')) as FlowprintDocument
    } catch {
      console.error(chalk.red(`Failed to read or parse: ${file1}`))
      process.exit(2)
    }

    try {
      doc2 = parse(readFileSync(resolve(file2), 'utf-8')) as FlowprintDocument
    } catch {
      console.error(chalk.red(`Failed to read or parse: ${file2}`))
      process.exit(2)
    }

    const changes = computeDiff(doc1, doc2)

    if (changes.length === 0) {
      console.log(chalk.green('No structural differences found.'))
    } else {
      console.log(chalk.bold(`${changes.length} difference(s) found:\n`))
      for (const change of changes) {
        switch (change.type) {
          case 'added':
            console.log(chalk.green(`  + ${change.category} ${change.id}`))
            if (change.detail) console.log(chalk.green(`    ${change.detail}`))
            break
          case 'removed':
            console.log(chalk.red(`  - ${change.category} ${change.id}`))
            if (change.detail) console.log(chalk.red(`    ${change.detail}`))
            break
          case 'modified':
            console.log(chalk.yellow(`  ~ ${change.category} ${change.id}`))
            if (change.detail) console.log(chalk.yellow(`    ${change.detail}`))
            break
        }
      }
    }

    process.exit(0)
  })

interface DiffChange {
  type: 'added' | 'removed' | 'modified'
  category: 'node' | 'lane' | 'edge' | 'metadata'
  id: string
  detail?: string
}

export function computeDiff(doc1: FlowprintDocument, doc2: FlowprintDocument): DiffChange[] {
  const changes: DiffChange[] = []

  // Compare lanes
  const laneIds1 = new Set(Object.keys(doc1.lanes ?? {}))
  const laneIds2 = new Set(Object.keys(doc2.lanes ?? {}))

  for (const id of laneIds2) {
    if (!laneIds1.has(id)) {
      changes.push({ type: 'added', category: 'lane', id })
    }
  }
  for (const id of laneIds1) {
    if (!laneIds2.has(id)) {
      changes.push({ type: 'removed', category: 'lane', id })
    }
  }
  for (const id of laneIds1) {
    if (laneIds2.has(id)) {
      const diff = compareLanes(doc1.lanes[id]!, doc2.lanes[id]!)
      if (diff) {
        changes.push({ type: 'modified', category: 'lane', id, detail: diff })
      }
    }
  }

  // Compare nodes
  const nodeIds1 = new Set(Object.keys(doc1.nodes ?? {}))
  const nodeIds2 = new Set(Object.keys(doc2.nodes ?? {}))

  for (const id of nodeIds2) {
    if (!nodeIds1.has(id)) {
      const node = doc2.nodes[id]!
      changes.push({
        type: 'added',
        category: 'node',
        id,
        detail: `type=${node.type}, lane=${node.lane}`,
      })
    }
  }
  for (const id of nodeIds1) {
    if (!nodeIds2.has(id)) {
      changes.push({ type: 'removed', category: 'node', id })
    }
  }
  for (const id of nodeIds1) {
    if (nodeIds2.has(id)) {
      const diff = compareNodes(doc1.nodes[id]!, doc2.nodes[id]!)
      if (diff) {
        changes.push({ type: 'modified', category: 'node', id, detail: diff })
      }
    }
  }

  // Compare edges
  const edges1 = extractEdgeSet(doc1)
  const edges2 = extractEdgeSet(doc2)

  for (const edge of edges2) {
    if (!edges1.has(edge)) {
      changes.push({ type: 'added', category: 'edge', id: edge })
    }
  }
  for (const edge of edges1) {
    if (!edges2.has(edge)) {
      changes.push({ type: 'removed', category: 'edge', id: edge })
    }
  }

  return changes
}

function compareLanes(a: Lane, b: Lane): string | undefined {
  const diffs: string[] = []
  if (a.label !== b.label) diffs.push(`label: "${a.label}" -> "${b.label}"`)
  if (a.visibility !== b.visibility) diffs.push(`visibility: ${a.visibility} -> ${b.visibility}`)
  if (a.order !== b.order) diffs.push(`order: ${a.order} -> ${b.order}`)
  return diffs.length > 0 ? diffs.join(', ') : undefined
}

function compareNodes(a: Node, b: Node): string | undefined {
  const diffs: string[] = []
  if (a.type !== b.type) diffs.push(`type: ${a.type} -> ${b.type}`)
  if (a.lane !== b.lane) diffs.push(`lane: ${a.lane} -> ${b.lane}`)
  if (a.label !== b.label) diffs.push(`label: "${a.label}" -> "${b.label}"`)

  // Compare JSON for deep equality of remaining fields
  const aRest = JSON.stringify(sortKeys(a))
  const bRest = JSON.stringify(sortKeys(b))
  if (aRest !== bRest && diffs.length === 0) {
    diffs.push('properties changed')
  }

  return diffs.length > 0 ? diffs.join(', ') : undefined
}

function sortKeys(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

function extractEdgeSet(doc: FlowprintDocument): Set<string> {
  const edges = new Set<string>()
  if (!doc.nodes) return edges

  for (const [nodeId, node] of Object.entries(doc.nodes)) {
    switch (node.type) {
      case 'action':
        if (node.next) edges.add(`${nodeId} -> ${node.next}`)
        if (node.error?.catch) edges.add(`${nodeId} -error-> ${node.error.catch}`)
        break
      case 'switch':
        for (const c of node.cases) {
          edges.add(`${nodeId} -[${c.when}]-> ${c.next}`)
        }
        if (node.default) edges.add(`${nodeId} -default-> ${node.default}`)
        break
      case 'parallel':
        for (const b of node.branches) {
          edges.add(`${nodeId} -> ${b}`)
        }
        edges.add(`${nodeId} -join-> ${node.join}`)
        break
      case 'wait':
        if (node.next) edges.add(`${nodeId} -> ${node.next}`)
        if (node.timeout_next) edges.add(`${nodeId} -timeout-> ${node.timeout_next}`)
        break
      case 'error':
        if (node.next) edges.add(`${nodeId} -> ${node.next}`)
        break
    }
  }

  return edges
}
