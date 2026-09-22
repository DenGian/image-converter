export const RESOURCE_LIMITS = {
  maxFiles: 30,
  maxFileBytes: 50 * 1024 * 1024,
  maxSourcePixels: 40_000_000,
  maxOutputWidth: 8192,
  maxOutputHeight: 8192,
  maxOutputPixels: 40_000_000,
  maxTotalSourceBytes: 150 * 1024 * 1024,
  maxTotalOutputBytes: 150 * 1024 * 1024,
  maxZipBytes: 75 * 1024 * 1024,
} as const

export function validateBatchSize(existing: number, incoming: number): string | null {
  if (existing + incoming > RESOURCE_LIMITS.maxFiles) {
    return `Add up to ${RESOURCE_LIMITS.maxFiles} images at a time.`
  }
  return null
}

export function validateFileSize(file: Pick<File, 'name' | 'size'>): string | null {
  if (file.size === 0) return `${file.name} is empty.`
  if (file.size > RESOURCE_LIMITS.maxFileBytes) return `${file.name} exceeds the 50 MiB limit.`
  return null
}

export function validateDimensions(width: number, height: number): string | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    return 'The image has invalid dimensions.'
  if (width * height > RESOURCE_LIMITS.maxSourcePixels)
    return 'The image exceeds the 40 megapixel limit.'
  return null
}

export function validateRequestedDimension(
  value: number | null,
  axis: 'width' | 'height',
): string | null {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || value <= 0)
    return `${axis === 'width' ? 'Width' : 'Height'} must be a positive whole number.`
  const limit = axis === 'width' ? RESOURCE_LIMITS.maxOutputWidth : RESOURCE_LIMITS.maxOutputHeight
  if (value > limit)
    return `${axis === 'width' ? 'Width' : 'Height'} must be at most ${limit} pixels.`
  return null
}

export function validateOutputDimensions(width: number, height: number): string | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    return 'Calculated output dimensions are invalid.'
  if (width > RESOURCE_LIMITS.maxOutputWidth || height > RESOURCE_LIMITS.maxOutputHeight)
    return 'Calculated output width and height must be at most 8192 pixels.'
  if (width * height > RESOURCE_LIMITS.maxOutputPixels)
    return 'Calculated output exceeds the 40 megapixel limit.'
  return null
}

export function validateTotalBytes(
  existing: number,
  incoming: number,
  kind: 'source' | 'output',
): string | null {
  const limit =
    kind === 'source' ? RESOURCE_LIMITS.maxTotalSourceBytes : RESOURCE_LIMITS.maxTotalOutputBytes
  if (!Number.isFinite(existing) || !Number.isFinite(incoming) || existing + incoming > limit)
    return `Retained ${kind} files would exceed the ${limit / 1024 / 1024} MiB batch limit.`
  return null
}

export function zipEligibility(totalBytes: number): string | null {
  return totalBytes > RESOURCE_LIMITS.maxZipBytes
    ? 'ZIP is unavailable above 75 MiB of completed files. Download files individually.'
    : null
}
