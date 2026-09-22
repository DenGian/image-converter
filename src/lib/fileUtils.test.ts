import { humanFileSize, percentageChange, uniqueOutputName } from './fileUtils'

describe('file utilities', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [10 * 1024 * 1024, '10 MB'],
  ])('formats %i bytes', (bytes, expected) => expect(humanFileSize(bytes)).toBe(expected))
  it('generates collision-safe names case-insensitively', () => {
    const names = new Set<string>()
    expect(uniqueOutputName('holiday.JPG', 'webp', names)).toBe('holiday.webp')
    expect(uniqueOutputName('holiday.png', 'webp', names)).toBe('holiday-2.webp')
    expect(uniqueOutputName('HOLIDAY.gif', 'webp', names)).toBe('HOLIDAY-3.webp')
  })
  it('reports before/after changes', () => {
    expect(percentageChange(1000, 740)).toBe('-26%')
    expect(percentageChange(100, 125)).toBe('+25%')
  })
})
