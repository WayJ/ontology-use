export const DEFAULT_PREFIX_MAP: Readonly<Record<string, string>> = {
  ou: 'http://example.org/ou/',
  fl: 'http://example.org/foaf-lite/',
}

const PREFIX_LINE =
  /@prefix\s+([A-Za-z_][\w-]*)\s*:\s*<([^>]+)>\s*\./g

export function parsePrefixMap(ontologyText: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const m of ontologyText.matchAll(PREFIX_LINE)) {
    map[m[1]!] = m[2]!
  }
  return map
}

const COMPACT = /^([A-Za-z_][\w-]*):(\S+)$/

function expandOneCompactIri(
  s: string,
  map: Record<string, string>,
): string {
  const m = COMPACT.exec(s)
  if (!m) return s
  const base = map[m[1]!]
  if (!base) return s
  return base + m[2]!
}

/** Expand compact IRIs; comma-joined values (e.g. fields objectIds) expand per segment. */
export function expandCompactIri(
  s: string,
  map: Record<string, string> = { ...DEFAULT_PREFIX_MAP },
): string {
  if (s.includes(',')) {
    return s
      .split(',')
      .map((part) => expandOneCompactIri(part.trim(), map))
      .join(',')
  }
  return expandOneCompactIri(s, map)
}

export function expandValue(
  value: string | string[] | Record<string, string>,
  map: Record<string, string> = { ...DEFAULT_PREFIX_MAP },
): string | string[] | Record<string, string> {
  if (typeof value === 'string') return expandCompactIri(value, map)
  if (Array.isArray(value)) return value.map((x) => expandCompactIri(x, map))
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = expandCompactIri(v, map)
  }
  return out
}

export function mergePrefixMap(
  extra?: Record<string, string>,
): Record<string, string> {
  return { ...DEFAULT_PREFIX_MAP, ...(extra ?? {}) }
}
