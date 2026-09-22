import { RESOURCE_LIMITS } from './validation'
import { validateZipEntries } from './zip'

it('rejects over-limit and colliding ZIP input', () => {
  expect(
    validateZipEntries([
      { name: 'a.png', blob: new Blob(['a']) },
      { name: 'A.PNG', blob: new Blob(['b']) },
    ]),
  ).toMatch(/unique/)
  expect(
    validateZipEntries([
      { name: 'big.png', blob: { size: RESOURCE_LIMITS.maxZipBytes + 1 } as Blob },
    ]),
  ).toMatch(/75 MiB/)
  expect(validateZipEntries([{ name: 'a.png', blob: new Blob(['a']) }])).toBeNull()
})
