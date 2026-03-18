import type { FlowprintDocument, Transform } from './types.js'

export function applyTransform(
  doc: FlowprintDocument,
  transform: Transform,
): FlowprintDocument {
  switch (transform.type) {
    case 'addField':
      return applyToScope(doc, transform, (rec) => {
        if (!(transform.field in rec)) {
          rec[transform.field] = transform.value
        }
      })
    case 'removeField':
      return applyToScope(doc, transform, (rec) => {
        delete rec[transform.field]
      })
    case 'renameField':
      return applyToScope(doc, transform, (rec) => {
        if (transform.from in rec) {
          rec[transform.to] = rec[transform.from]
          delete rec[transform.from]
        }
      })
    case 'renameNodeType':
      for (const node of Object.values(doc.nodes)) {
        if (node.type === transform.from) {
          ;(node as Record<string, unknown>).type = transform.to
        }
      }
      return doc
    case 'setDefault':
      return applyToScope(doc, transform, (rec) => {
        if (rec[transform.field] === undefined || rec[transform.field] === null) {
          rec[transform.field] = transform.value
        }
      })
    case 'changeFieldType':
      for (const node of Object.values(doc.nodes)) {
        if (transform.nodeType && node.type !== transform.nodeType) continue
        const rec = node as Record<string, unknown>
        if (transform.field in rec) {
          rec[transform.field] = transform.convert(rec[transform.field])
        }
      }
      return doc
  }
}

function applyToScope(
  doc: FlowprintDocument,
  transform: { scope: 'nodes' | 'metadata'; nodeType?: string },
  fn: (rec: Record<string, unknown>) => void,
): FlowprintDocument {
  if (transform.scope === 'nodes') {
    for (const node of Object.values(doc.nodes)) {
      if (transform.nodeType && node.type !== transform.nodeType) continue
      fn(node as Record<string, unknown>)
    }
  } else if (transform.scope === 'metadata') {
    doc.metadata = doc.metadata ?? ({} as Record<string, string>)
    fn(doc.metadata as Record<string, unknown>)
  }
  return doc
}

export function describeTransform(transform: Transform): string {
  const scopeLabel = (t: { scope?: string; nodeType?: string }) =>
    t.nodeType ? `${t.nodeType} nodes` : (t.scope ?? 'nodes')

  switch (transform.type) {
    case 'addField':
      return `Added "${transform.field}" field to ${scopeLabel(transform)}`
    case 'removeField':
      return `Removed "${transform.field}" field from ${scopeLabel(transform)}`
    case 'renameField':
      return `Renamed "${transform.from}" to "${transform.to}" in ${scopeLabel(transform)}`
    case 'renameNodeType':
      return `Renamed node type "${transform.from}" to "${transform.to}"`
    case 'setDefault':
      return `Set default "${transform.field}" = ${JSON.stringify(transform.value)} in ${scopeLabel(transform)}`
    case 'changeFieldType':
      return `Converted "${transform.field}" field type in ${scopeLabel(transform)}`
  }
}
