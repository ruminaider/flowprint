/**
 * Parse a subset of ISO 8601 duration strings into milliseconds.
 *
 * Supports: PT##H##M##S (hours, minutes, seconds — all optional but at least one required).
 * Also supports the legacy engine shorthand: ##d, ##h, ##m, ##s.
 */
export function parseDuration(iso: string): number {
  // ISO 8601 PT format
  const ptMatch = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (ptMatch && (ptMatch[1] || ptMatch[2] || ptMatch[3])) {
    const hours = parseInt(ptMatch[1] ?? '0', 10)
    const minutes = parseInt(ptMatch[2] ?? '0', 10)
    const seconds = parseInt(ptMatch[3] ?? '0', 10)
    return (hours * 3600 + minutes * 60 + seconds) * 1000
  }

  // Legacy shorthand: 7d, 24h, 30m, 60s
  const shortMatch = iso.match(/^(\d+)(d|h|m|s)$/)
  if (shortMatch) {
    const value = parseInt(shortMatch[1]!, 10)
    switch (shortMatch[2]) {
      case 'd':
        return value * 86_400_000
      case 'h':
        return value * 3_600_000
      case 'm':
        return value * 60_000
      case 's':
        return value * 1000
    }
  }

  throw new Error(`Invalid duration: "${iso}". Expected ISO 8601 PT format (e.g. PT24H, PT30M) or shorthand (e.g. 24h, 30m).`)
}
