import { resolve } from 'node:path'
import { assertWithinProject } from '../security/index.js'

/**
 * Dynamically import an entry point file and extract the named symbol.
 *
 * @param entry - The entry point definition with file and symbol
 * @param projectRoot - The root directory to resolve relative paths from
 * @returns The exported function
 */
export async function loadEntryPoint(
  entry: { file: string; symbol: string },
  projectRoot: string,
): Promise<(...args: unknown[]) => unknown> {
  assertWithinProject(entry.file, projectRoot)
  const filePath = resolve(projectRoot, entry.file)

  let mod: Record<string, unknown>
  try {
    mod = (await import(filePath)) as Record<string, unknown>
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to load entry point file "${entry.file}" (resolved to ${filePath}): ${message}`,
    )
  }

  const fn = mod[entry.symbol]
  if (typeof fn !== 'function') {
    const available = Object.keys(mod)
      .filter((k) => typeof mod[k] === 'function')
      .join(', ')
    throw new Error(
      `Symbol "${entry.symbol}" not found or not a function in "${entry.file}". Available functions: ${available || '(none)'}`,
    )
  }

  return fn as (...args: unknown[]) => unknown
}
