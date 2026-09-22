import { RESOURCE_LIMITS, zipEligibility } from './validation'

export interface ZipEntry {
  name: string
  blob: Blob
}

export function validateZipEntries(entries: ZipEntry[]): string | null {
  if (!entries.length || entries.length > RESOURCE_LIMITS.maxFiles)
    return 'ZIP requires 1 to 30 files.'
  const names = new Set<string>()
  let bytes = 0
  for (const entry of entries) {
    if (!entry.name || names.has(entry.name.toLowerCase())) return 'ZIP filenames must be unique.'
    names.add(entry.name.toLowerCase())
    bytes += entry.blob.size
  }
  return zipEligibility(bytes)
}
