import type { StorybookConfig } from '@storybook/react-vite'

import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const storybookDir = dirname(fileURLToPath(import.meta.url))
const mockPath = (...paths: string[]) => join(storybookDir, 'mocks', ...paths)

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      'fs/promises': mockPath('fs-promises.ts'),
      path: mockPath('path.ts'),
      'react-fontawesome': mockPath('react-fontawesome.tsx'),
      'views/components/etc/overlay': mockPath('overlay.tsx'),
      'views/components/main/parts/countdown-timer': mockPath(
        'countdown-timer.tsx',
      ),
      'views/utils/selectors': mockPath('selectors.ts'),
      'views/utils/tools': mockPath('tools.ts'),
    }

    return config
  },
}

export default config
