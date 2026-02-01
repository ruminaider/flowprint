import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Load fixture data for wait nodes from a JSON file.
 *
 * @param path - Path to the JSON fixtures file
 * @returns A map of nodeId -> fixture data
 */
export async function loadFixtures(path: string): Promise<Record<string, unknown>> {
  const resolved = resolve(path)

  let content: string
  try {
    content = await readFile(resolved, 'utf-8')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read fixtures file "${path}": ${message}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Fixtures file "${path}" contains invalid JSON`)
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      `Fixtures file "${path}" must contain a JSON object (got ${Array.isArray(parsed) ? 'array' : typeof parsed})`,
    )
  }

  return parsed as Record<string, unknown>
}
