export const RESOURCE_LIMITS = {
  maxFiles: 30,
  maxFileBytes: 50 * 1024 * 1024,
  maxPixels: 40_000_000,
} as const

export function validateBatchSize(existing: number, incoming: number): string | null {
  if (existing + incoming > RESOURCE_LIMITS.maxFiles) {
    return `Add up to ${RESOURCE_LIMITS.maxFiles} images at a time.`
  }
  return null
}

export function validateFileSize(file: Pick<File, 'name' | 'size'>): string | null {
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > RESOURCE_LIMITS.maxFileBytes) return `${file.name} exceeds the 50 MB limit.`
  return null
}

export function validateDimensions(width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return 'The image has invalid dimensions.'
  if (width * height > RESOURCE_LIMITS.maxPixels) return 'The image exceeds the 40 megapixel limit.'
  return null
}
