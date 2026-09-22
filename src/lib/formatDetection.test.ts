import { CAPABILITIES, INPUT_FORMATS, OUTPUT_FORMATS } from '../formats'
import { detectFormat } from './formatDetection'

describe('format detection and capabilities', () => {
  it.each([
    ['jpeg', [0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]],
    ['gif', [...new TextEncoder().encode('GIF89a'), 0, 0, 0, 0, 0, 0]],
    ['bmp', [...new TextEncoder().encode('BM'), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
    ['webp', [...new TextEncoder().encode('RIFF0000WEBP')]],
    ['tiff', [...new TextEncoder().encode('II*\0'), 8, 0, 0, 0, 0, 0, 0, 0]],
    ['avif', [0, 0, 0, 24, ...new TextEncoder().encode('ftypavif')]],
    ['heic', [0, 0, 0, 24, ...new TextEncoder().encode('ftypheic')]],
  ])('detects %s from content', (format, bytes) => {
    expect(detectFormat(new Uint8Array(bytes))).toBe(format)
  })

  it('rejects extensions masquerading as an image', () => {
    expect(detectFormat(new Uint8Array(20))).toBeNull()
  })

  it('expresses the deliberate asymmetric support', () => {
    expect(INPUT_FORMATS).toContain('heic')
    expect(OUTPUT_FORMATS).not.toContain('heic')
    expect(INPUT_FORMATS).not.toContain('ico')
    expect(OUTPUT_FORMATS).toContain('ico')
    expect(Object.values(CAPABILITIES).filter((entry) => entry.output)).toHaveLength(8)
  })
})
