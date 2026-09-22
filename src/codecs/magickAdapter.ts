import {
  AlphaAction,
  Gravity,
  ImageMagick,
  MagickColor,
  MagickFormat,
  type IMagickImage,
} from '@imagemagick/magick-wasm'
import { CAPABILITIES, type OutputFormat } from '../formats'
import { calculateResize } from '../lib/resize'
import type { ConversionOptions } from '../types'
import type { InspectResult } from './protocol'

const MAGICK_FORMAT: Record<OutputFormat, (typeof MagickFormat)[keyof typeof MagickFormat]> = {
  jpeg: MagickFormat.Jpeg,
  png: MagickFormat.Png,
  webp: MagickFormat.WebP,
  avif: MagickFormat.Avif,
  gif: MagickFormat.Gif,
  bmp: MagickFormat.Bmp,
  tiff: MagickFormat.Tiff,
  ico: MagickFormat.Ico,
}

export function inspectWithMagick(bytes: Uint8Array): InspectResult {
  return ImageMagick.readCollection(bytes, (images) => {
    const first = images[0]
    if (!first) throw new Error('No readable image frame was found.')
    return {
      width: first.width,
      height: first.height,
      frameCount: images.length,
      format: first.format,
    }
  })
}

function resizeImage(image: IMagickImage, options: ConversionOptions): void {
  const plan = calculateResize({ width: image.width, height: image.height }, options.resize)
  if (plan.width !== image.width || plan.height !== image.height) {
    image.resize(plan.width, plan.height)
  }
  if (plan.cropWidth && plan.cropHeight) {
    image.crop(plan.cropWidth, plan.cropHeight, Gravity.Center)
    image.resetPage()
  }
}

export function convertWithMagick(
  bytes: Uint8Array,
  options: ConversionOptions,
): { bytes: Uint8Array; width: number; height: number; frameCount: number } {
  return ImageMagick.readCollection(bytes, (images) => {
    const image = images[0]
    if (!image) throw new Error('No readable image frame was found.')

    image.autoOrient()
    resizeImage(image, options)

    if (!CAPABILITIES[options.format].alpha) {
      image.backgroundColor = new MagickColor(options.background)
      image.alpha(AlphaAction.Remove)
    }
    if (CAPABILITIES[options.format].lossy) image.quality = options.quality
    if (options.stripMetadata) image.strip()

    if (options.format === 'ico' && (image.width > 256 || image.height > 256)) {
      const ratio = Math.min(256 / image.width, 256 / image.height)
      image.resize(Math.round(image.width * ratio), Math.round(image.height * ratio))
    }

    let output = new Uint8Array()
    image.write(MAGICK_FORMAT[options.format], (data) => {
      output = new Uint8Array(data)
    })
    return {
      bytes: output,
      width: image.width,
      height: image.height,
      frameCount: images.length,
    }
  })
}
