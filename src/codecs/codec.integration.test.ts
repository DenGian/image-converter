// @vitest-environment node
// Fixtures are generated in memory from solid colours; they are original CC0 test data.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ImageMagick,
  MagickColors,
  MagickFormat,
  initializeImageMagick,
} from '@imagemagick/magick-wasm'
import { OUTPUT_FORMATS, type OutputFormat } from '../formats'
import type { ConversionOptions } from '../types'
import { convertWithMagick, inspectWithMagick } from './magickAdapter'

const wasm = readFileSync(resolve('node_modules/@imagemagick/magick-wasm/dist/x86/magick.wasm'))
const defaults: ConversionOptions = {
  format: 'png',
  quality: 82,
  background: '#ffffff',
  stripMetadata: true,
  resize: {
    width: null,
    height: null,
    fit: 'contain',
    preserveAspectRatio: true,
    neverUpscale: true,
  },
}

const makeFixture = (transparent = false) => {
  let bytes = new Uint8Array()
  ImageMagick.read(transparent ? MagickColors.Transparent : MagickColors.Coral, 8, 5, (image) =>
    image.write(MagickFormat.Png, (data) => {
      bytes = new Uint8Array(data)
    }),
  )
  return bytes
}

const magic: Record<OutputFormat, (bytes: Uint8Array) => boolean> = {
  jpeg: (b) => b[0] === 0xff && b[1] === 0xd8,
  png: (b) => b[0] === 0x89 && b[1] === 0x50,
  webp: (b) => String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  avif: (b) => String.fromCharCode(...b.slice(4, 8)) === 'ftyp',
  gif: (b) => String.fromCharCode(...b.slice(0, 3)) === 'GIF',
  bmp: (b) => String.fromCharCode(...b.slice(0, 2)) === 'BM',
  tiff: (b) => ['II', 'MM'].includes(String.fromCharCode(...b.slice(0, 2))),
  ico: (b) => b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0,
}

describe('distributed codec integration', () => {
  beforeAll(async () => initializeImageMagick(new Uint8Array(wasm)))

  it.each(OUTPUT_FORMATS)('encodes advertised %s output with valid bytes', (format) => {
    const result = convertWithMagick(makeFixture(), { ...defaults, format })
    expect(result.bytes.byteLength).toBeGreaterThan(20)
    expect(magic[format](result.bytes)).toBe(true)
    if (format === 'ico') {
      expect(result.bytes[6]).toBe(8)
      expect(result.bytes[7]).toBe(5)
    } else {
      const inspection = inspectWithMagick(result.bytes)
      expect(inspection).toMatchObject({ width: 8, height: 5 })
    }
  })

  it('flattens transparent pixels for non-alpha output', () => {
    const jpeg = convertWithMagick(makeFixture(true), {
      ...defaults,
      format: 'jpeg',
      background: '#ff0000',
    })
    ImageMagick.read(jpeg.bytes, (image) => expect(image.hasAlpha).toBe(false))
  })

  it('decodes the advertised HEIC input fixture', () => {
    const heic = new Uint8Array(
      Buffer.from(
        readFileSync(resolve('tests/fixtures/tiny-heic.base64'), 'utf8').trim(),
        'base64',
      ),
    )
    expect(inspectWithMagick(heic)).toMatchObject({ width: 4, height: 3, format: 'HEIC' })
    const png = convertWithMagick(heic, defaults)
    expect(magic.png(png.bytes)).toBe(true)
  })

  it('applies EXIF orientation before encoding', () => {
    const oriented = new Uint8Array(
      Buffer.from(
        readFileSync(resolve('tests/fixtures/oriented-jpeg.base64'), 'utf8').trim(),
        'base64',
      ),
    )
    const result = convertWithMagick(oriented, defaults)
    expect({ width: result.width, height: result.height }).toEqual({ width: 5, height: 8 })
  })

  it('rejects a corrupted input', () =>
    expect(() => inspectWithMagick(new Uint8Array([1, 2, 3, 4]))).toThrow())

  it('rejects unsafe worker-side resize before encoding', () => {
    expect(() =>
      convertWithMagick(makeFixture(), {
        ...defaults,
        resize: { ...defaults.resize, width: 8193 },
      }),
    ).toThrow(/8192/)
    expect(() =>
      convertWithMagick(makeFixture(), { ...defaults, resize: { ...defaults.resize, width: NaN } }),
    ).toThrow(/positive whole number/)
  })
})
