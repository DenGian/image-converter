import '@testing-library/jest-dom/vitest'

if (typeof window !== 'undefined')
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })

if (typeof window !== 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: () => 'blob:test-preview',
  })
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: () => undefined })
}
