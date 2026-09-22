import type { ImageDimensions, ResizeOptions } from '../types'
import { validateOutputDimensions, validateRequestedDimension } from './validation'

export interface ResizePlan extends ImageDimensions {
  cropWidth: number | null
  cropHeight: number | null
}

export function calculateResize(source: ImageDimensions, options: ResizeOptions): ResizePlan {
  const widthError = validateRequestedDimension(options.width, 'width')
  const heightError = validateRequestedDimension(options.height, 'height')
  if (widthError || heightError) throw new Error(widthError ?? heightError!)
  const requestedWidth = options.width && options.width > 0 ? options.width : null
  const requestedHeight = options.height && options.height > 0 ? options.height : null
  if (!requestedWidth && !requestedHeight) {
    return { ...source, cropWidth: null, cropHeight: null }
  }

  if (!options.preserveAspectRatio) {
    return {
      width: options.neverUpscale
        ? Math.min(requestedWidth ?? source.width, source.width)
        : (requestedWidth ?? source.width),
      height: options.neverUpscale
        ? Math.min(requestedHeight ?? source.height, source.height)
        : (requestedHeight ?? source.height),
      cropWidth: null,
      cropHeight: null,
    }
  }

  const targetWidth = requestedWidth ?? Number.POSITIVE_INFINITY
  const targetHeight = requestedHeight ?? Number.POSITIVE_INFINITY
  const widthScale = targetWidth / source.width
  const heightScale = targetHeight / source.height
  let scale =
    options.fit === 'cover' && requestedWidth && requestedHeight
      ? Math.max(widthScale, heightScale)
      : Math.min(widthScale, heightScale)
  if (!Number.isFinite(scale)) scale = Number.isFinite(widthScale) ? widthScale : heightScale
  if (options.neverUpscale) scale = Math.min(scale, 1)

  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const shouldCrop = options.fit === 'cover' && requestedWidth && requestedHeight
  return {
    width,
    height,
    cropWidth: shouldCrop ? Math.min(requestedWidth, width) : null,
    cropHeight: shouldCrop ? Math.min(requestedHeight, height) : null,
  }
}

export function validateResizePlan(source: ImageDimensions, options: ResizeOptions): string | null {
  try {
    const plan = calculateResize(source, options)
    return validateOutputDimensions(plan.width, plan.height)
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid resize settings.'
  }
}
