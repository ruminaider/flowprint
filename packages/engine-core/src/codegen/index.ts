import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { GenerateResult, GenerateOptions, GeneratedFile } from './types.js'
import { generateWorkflow } from './workflow-generator.js'
import { generateActivities } from './activities-generator.js'
import { generateWorker } from './worker-generator.js'
import { generateTypes } from './types-generator.js'
import { generateTestFixtures } from './test-fixtures-generator.js'

export function generateCode(doc: FlowprintDocument, options: GenerateOptions): GenerateResult {
  const files: GeneratedFile[] = [
    generateWorkflow(doc),
    generateActivities(doc),
    generateWorker(doc),
    generateTypes(doc),
    ...generateTestFixtures(doc),
  ]
  return { files, flowName: options.flowName }
}

export { generateWorkflow } from './workflow-generator.js'
export { generateActivities } from './activities-generator.js'
export { generateWorker } from './worker-generator.js'
export { generateTypes } from './types-generator.js'
export { generateTestFixtures } from './test-fixtures-generator.js'
export type { GenerateResult, GenerateOptions, GeneratedFile } from './types.js'
