import { resolve, sep, relative } from 'node:path'

/**
 * Assert that a file path resolves within the project root directory.
 * Prevents path traversal attacks (e.g. `../../etc/passwd`).
 *
 * @param filePath - The file path to validate (absolute or relative)
 * @param projectRoot - The root directory boundary
 * @throws Error if the resolved path is outside the project root
 */
export function assertWithinProject(filePath: string, projectRoot: string): void {
  const resolved = resolve(projectRoot, filePath)
  if (!resolved.startsWith(projectRoot + sep) && resolved !== projectRoot) {
    throw new Error(`Path "${relative(projectRoot, resolved)}" resolves outside project root`)
  }
}
