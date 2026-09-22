import {
  RESOURCE_LIMITS,
  validateBatchSize,
  validateDimensions,
  validateFileSize,
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
})
