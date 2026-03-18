export interface ParsedVersion {
  major: number
  minor: number
}

const VERSION_RE = /^flowprint\/(\d+)\.(\d+)$/

export function parseVersion(version: string): ParsedVersion {
  const match = VERSION_RE.exec(version)
  if (!match) {
    throw new Error(`Invalid version format: "${version}". Expected "flowprint/X.Y"`)
  }
  return { major: Number(match[1]), minor: Number(match[2]) }
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (pa.major !== pb.major) return pa.major - pb.major
  return pa.minor - pb.minor
}

export function isMajorBump(from: string, to: string): boolean {
  return parseVersion(from).major !== parseVersion(to).major
}
