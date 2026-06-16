import type { Meta, StoryObj } from '@storybook/react-vite'

import { RepairQueue } from './candidates'
import { readmeScenarios } from './storybook-state'

const meta = {
  title: 'README/Repair Queue',
  component: RepairQueue,
  parameters: {
    layout: 'fullscreen',
    pluginState: readmeScenarios.pairedRepairBonus,
  },
} satisfies Meta<typeof RepairQueue>

export default meta

type Story = StoryObj<typeof meta>

export const MinorDamageOrBetterCandidates: Story = {
  name: 'Repair target eligibility',
}
