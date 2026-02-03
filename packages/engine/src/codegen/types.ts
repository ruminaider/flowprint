export interface GenerateOptions {
  outputDir: string
  flowName: string
}

export interface GeneratedFile {
  path: string
  content: string
}

export interface GenerateResult {
  files: GeneratedFile[]
  flowName: string
}
