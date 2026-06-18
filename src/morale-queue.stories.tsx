import type { Meta, StoryObj } from '@storybook/react-vite'

import { MoraleQueue } from './candidates'
import { readmeScenarios } from './storybook-state'

const meta = {
  title: 'README/Morale Queue',
  component: MoraleQueue,
  args: {
    initialWatchedShipIds: [31, 33],
  },
  parameters: {
    layout: 'fullscreen',
    pluginState: readmeScenarios.nosakiMorale,
  },
} satisfies Meta<typeof MoraleQueue>

export default meta

type Story = StoryObj<typeof meta>

export const MoraleBoostCandidates: Story = {
  name: 'Morale boost candidates',
}
