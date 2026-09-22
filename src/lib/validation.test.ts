import {
  RESOURCE_LIMITS,
  validateBatchSize,
  validateDimensions,
  validateFileSize,
  validateRequestedDimension,
  validateOutputDimensions,
  validateTotalBytes,
  zipEligibility,
} from './validation'

describe('resource validation', () => {
  it('enforces batch and byte limits', () => {
    expect(validateBatchSize(29, 2)).toMatch(/30/)
    expect(validateFileSize({ name: 'huge.tif', size: RESOURCE_LIMITS.maxFileBytes + 1 })).toMatch(
      /huge\.tif/,
    )
    expect(validateFileSize({ name: 'empty.png', size: 0 })).toMatch(/empty/)
  })
  it('enforces pixel limits', () => {
    expect(validateDimensions(10_000, 5_000)).toMatch(/40 megapixel/)
    expect(validateDimensions(100, 100)).toBeNull()
  })
  it('rejects invalid and excessive requested dimensions', () => {
    for (const value of [NaN, Infinity, -1, 0, 1.5, 8193])
      expect(validateRequestedDimension(value, 'width')).toBeTruthy()
    expect(validateRequestedDimension(8192, 'width')).toBeNull()
    expect(validateOutputDimensions(8000, 8000)).toMatch(/40 megapixel/)
    expect(validateOutputDimensions(8193, 1)).toMatch(/8192/)
  })
  it('enforces retained byte and ZIP thresholds', () => {
    expect(validateTotalBytes(RESOURCE_LIMITS.maxTotalSourceBytes, 1, 'source')).toMatch(/150 MiB/)
    expect(validateTotalBytes(RESOURCE_LIMITS.maxTotalOutputBytes, 1, 'output')).toMatch(/150 MiB/)
    expect(zipEligibility(RESOURCE_LIMITS.maxZipBytes + 1)).toMatch(/unavailable/)
    expect(zipEligibility(RESOURCE_LIMITS.maxZipBytes)).toBeNull()
  })
})
