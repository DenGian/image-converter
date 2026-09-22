import { calculateResize } from './resize'

const base = {
  width: null,
  height: null,
  fit: 'contain' as const,
  preserveAspectRatio: true,
  neverUpscale: true,
}

describe('resize calculations', () => {
  it('preserves dimensions without a request', () =>
    expect(calculateResize({ width: 1200, height: 800 }, base)).toEqual({
      width: 1200,
      height: 800,
      cropWidth: null,
      cropHeight: null,
    }))
  it('contains within both bounds', () =>
    expect(
      calculateResize({ width: 1200, height: 800 }, { ...base, width: 300, height: 300 }),
    ).toEqual({ width: 300, height: 200, cropWidth: null, cropHeight: null }))
  it('covers and crops centrally', () =>
    expect(
      calculateResize(
        { width: 1200, height: 800 },
        { ...base, width: 300, height: 300, fit: 'cover' },
      ),
    ).toEqual({ width: 450, height: 300, cropWidth: 300, cropHeight: 300 }))
  it('never upscales', () =>
    expect(
      calculateResize({ width: 100, height: 50 }, { ...base, width: 400, height: 400 }),
    ).toEqual({ width: 100, height: 50, cropWidth: null, cropHeight: null }))
})
