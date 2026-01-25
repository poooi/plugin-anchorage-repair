import { defineConfig } from 'vitest/config'

/** Helper to create a path alias from a relative path */
const alias = (path: string) => new URL(path, import.meta.url).pathname

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
      'views/utils/selectors': alias('./src/__tests__/mocks/views-utils-selectors.ts'),
      'views/utils/tools': alias('./src/__tests__/mocks/views-utils-tools.ts'),
      'views/components/main/parts/countdown-timer': alias('./src/__tests__/mocks/countdown-timer.tsx'),
      'views/components/etc/overlay': alias('./src/__tests__/mocks/overlay.tsx'),
      'react-fontawesome': alias('./src/__tests__/mocks/react-fontawesome.tsx'),
    },
  },
})
