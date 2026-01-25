import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/shims.d.ts',
      ],
    },
    alias: {
      'views/utils/selectors': new URL('./src/__tests__/mocks/views-utils-selectors.ts', import.meta.url).pathname,
      'views/utils/tools': new URL('./src/__tests__/mocks/views-utils-tools.ts', import.meta.url).pathname,
      'views/components/main/parts/countdown-timer': new URL('./src/__tests__/mocks/countdown-timer.tsx', import.meta.url).pathname,
      'views/components/etc/overlay': new URL('./src/__tests__/mocks/overlay.tsx', import.meta.url).pathname,
      'react-fontawesome': new URL('./src/__tests__/mocks/react-fontawesome.tsx', import.meta.url).pathname,
    },
  },
})
