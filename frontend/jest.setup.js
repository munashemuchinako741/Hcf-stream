// jest.setup.js

import '@testing-library/jest-dom'

// Optional: mock matchMedia if you ever need it
if (!global.matchMedia) {
  global.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// Mock ResizeObserver for Radix UI / useSize
class ResizeObserver {
  constructor(callback) {
    // you can store callback if you ever want to trigger it
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Make it available in the Jest/JSDOM environment
global.ResizeObserver = ResizeObserver
globalThis.ResizeObserver = ResizeObserver
