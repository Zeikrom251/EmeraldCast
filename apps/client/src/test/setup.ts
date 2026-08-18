import '@testing-library/jest-dom/vitest'

// jsdom does not implement randomUUID; the reducer uses it for every slot id.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  let counter = 0
  Object.defineProperty(globalThis.crypto ?? (globalThis.crypto = {} as Crypto), 'randomUUID', {
    configurable: true,
    value: () => `00000000-0000-4000-8000-${String((counter += 1)).padStart(12, '0')}`,
  })
}
