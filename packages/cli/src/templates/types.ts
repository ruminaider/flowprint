export interface TemplateMetadata {
  name: string
  description: string
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'showcase'
}

export interface LoadedTemplate extends TemplateMetadata {
  /** Raw YAML content of the blueprint file */
  blueprintYaml: string
  /** Relative path -> YAML content for rules files */
  rulesFiles: Record<string, string>
  /** README content */
  readme: string
}
