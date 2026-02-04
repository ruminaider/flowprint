import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { GeneratedFile } from './types.js'
import { FILE_HEADER } from './utils.js'

export function generateWorker(doc: FlowprintDocument): GeneratedFile {
  const taskQueue = doc.workflow?.task_queue ?? doc.name

  const lines = [
    `import { NativeConnection, Worker } from '@temporalio/worker'`,
    `import * as activities from './activities'`,
    ``,
    `async function run() {`,
    `  const connection = await NativeConnection.connect({`,
    `    address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233',`,
    `  })`,
    ``,
    `  const worker = await Worker.create({`,
    `    connection,`,
    `    namespace: process.env.TEMPORAL_NAMESPACE ?? 'default',`,
    `    taskQueue: '${taskQueue}',`,
    `    workflowsPath: require.resolve('./workflow'),`,
    `    activities,`,
    `  })`,
    ``,
    `  await worker.run()`,
    `}`,
    ``,
    `run().catch(console.error)`,
  ]

  const content = FILE_HEADER + lines.join('\n') + '\n'
  return { path: 'worker.ts', content }
}
