export const CAPABILITIES = {
  jpeg: {
    label: 'JPEG',
    extensions: ['jpg', 'jpeg'],
    mime: 'image/jpeg',
    input: true,
    output: true,
    alpha: false,
    lossy: true,
    browserPreview: true,
  },
  png: {
    label: 'PNG',
    extensions: ['png'],
    mime: 'image/png',
    input: true,
    output: true,
    alpha: true,
    lossy: false,
    browserPreview: true,
  },
  webp: {
    label: 'WebP',
    extensions: ['webp'],
    mime: 'image/webp',
    input: true,
    output: true,
    alpha: true,
    lossy: true,
    browserPreview: true,
  },
  avif: {
    label: 'AVIF',
    extensions: ['avif'],
    mime: 'image/avif',
    input: true,
    output: true,
    alpha: true,
    lossy: true,
    browserPreview: true,
  },
  gif: {
    label: 'GIF',
    extensions: ['gif'],
    mime: 'image/gif',
    input: true,
    output: true,
    alpha: true,
    lossy: false,
    browserPreview: true,
  },
  bmp: {
    label: 'BMP',
    extensions: ['bmp'],
    mime: 'image/bmp',
    input: true,
    output: true,
    alpha: false,
    lossy: false,
    browserPreview: true,
  },
  tiff: {
    label: 'TIFF',
    extensions: ['tif', 'tiff'],
    mime: 'image/tiff',
    input: true,
    output: true,
    alpha: true,
    lossy: false,
    browserPreview: false,
  },
  heic: {
    label: 'HEIC / HEIF',
    extensions: ['heic', 'heif'],
    mime: 'image/heic',
    input: true,
    output: false,
    alpha: true,
    lossy: true,
    browserPreview: false,
  },
  ico: {
    label: 'ICO',
    extensions: ['ico'],
    mime: 'image/x-icon',
    input: false,
    output: true,
    alpha: true,
    lossy: false,
    browserPreview: true,
  },
} as const

export type ImageFormat = keyof typeof CAPABILITIES
export type InputFormat = {
  [K in ImageFormat]: (typeof CAPABILITIES)[K]['input'] extends true ? K : never
}[ImageFormat]
export type OutputFormat = {
  [K in ImageFormat]: (typeof CAPABILITIES)[K]['output'] extends true ? K : never
}[ImageFormat]

export const INPUT_FORMATS = Object.entries(CAPABILITIES)
  .filter(([, value]) => value.input)
  .map(([key]) => key as InputFormat)

export const OUTPUT_FORMATS = Object.entries(CAPABILITIES)
  .filter(([, value]) => value.output)
  .map(([key]) => key as OutputFormat)

export const ACCEPTED_FILES = INPUT_FORMATS.flatMap((format) =>
  CAPABILITIES[format].extensions.map((extension) => `.${extension}`),
).join(',')

export const isOutputFormat = (value: string): value is OutputFormat =>
  OUTPUT_FORMATS.includes(value as OutputFormat)
