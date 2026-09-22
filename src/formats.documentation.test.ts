// @vitest-environment node
import { readFileSync } from 'node:fs'
import { CAPABILITIES, type ImageFormat } from './formats'

const readme = readFileSync('README.md', 'utf8')
const documentedRows = new Map(
  readme
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 3)
    .map((cells) => [cells[0], cells] as const),
)
const rowNames: Record<ImageFormat, string> = {
  jpeg: 'JPEG / JPG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
  gif: 'GIF',
  bmp: 'BMP',
  tiff: 'TIFF / TIF',
  heic: 'HEIC / HEIF',
  ico: 'ICO',
}

describe('documented capability matrix', () => {
  it.each(Object.keys(CAPABILITIES) as ImageFormat[])(
    '%s matches the source of truth',
    (format) => {
      const capability = CAPABILITIES[format]
      const input = capability.input ? '✓' : '—'
      const output = capability.output ? '✓' : '—'
      expect(documentedRows.get(rowNames[format])?.slice(1, 3)).toEqual([input, output])
    },
  )
})
