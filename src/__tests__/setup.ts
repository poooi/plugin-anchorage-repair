import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ''
  readonly thresholds: readonly number[] = []
  private callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }

  observe(): void {
    // Immediately trigger as if the element is visible
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this,
    )
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
})

// Mock window.ticker for countup-timer tests
const mockTicker = {
  callbacks: new Map<string, (currentTime: number) => void>(),
  reg(id: string, callback: (currentTime: number) => void) {
    this.callbacks.set(id, callback)
  },
  unreg(id: string) {
    this.callbacks.delete(id)
  },
  tick(currentTime?: number) {
    const time = currentTime ?? Date.now()
    this.callbacks.forEach((callback) => callback(time))
  },
}

// Add ticker to window
Object.defineProperty(window, 'ticker', {
  value: mockTicker,
  writable: true,
})

// Mock window.ROOT
Object.defineProperty(window, 'ROOT', {
  value: '/app',
  writable: true,
})

// Mock window.getStore
Object.defineProperty(window, 'getStore', {
  value: vi.fn(() => ({})),
  writable: true,
})

// Export the mock ticker for test manipulation
export { mockTicker }
