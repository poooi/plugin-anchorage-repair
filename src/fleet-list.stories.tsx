import type { Meta, StoryObj } from '@storybook/react-vite'

import React from 'react'

import FleetList from './fleet-list'
import {
  moraleTimerReady,
  oneMinuteAgo,
  readmeScenarios,
  repairTimerReady,
} from './storybook-state'
import { timerState } from './timer-state'

const meta = {
  title: 'README/Fleet Conditions',
  component: FleetList,
  args: {
    fleetId: 1,
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof FleetList>

export default meta

type Story = StoryObj<typeof meta>

const withTimers = (repairRefresh = 0, nosakiRefresh = 0) => {
  timerState.setLastRepairRefresh(repairRefresh)
  timerState.setLastNosakiRefresh(nosakiRefresh)
}

export const AkashiAnchorageRepair: Story = {
  name: "Akashi's anchorage repair",
  decorators: [
    (Story) => {
      withTimers(repairTimerReady, 0)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.akashiRepair,
  },
}

export const PairedRepairBonus: Story = {
  name: 'Paired repair bonus',
  decorators: [
    (Story) => {
      withTimers(repairTimerReady, 0)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.pairedRepairBonus,
  },
}

export const NosakiMoraleBoost: Story = {
  name: "Nosaki's morale boost",
  decorators: [
    (Story) => {
      withTimers(0, moraleTimerReady)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.nosakiMorale,
  },
}

export const CombinedOperation: Story = {
  name: 'Combined operation',
  decorators: [
    (Story) => {
      withTimers(repairTimerReady, moraleTimerReady)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.combinedOperation,
  },
}

export const TimerStartedButNeedsPortRefresh: Story = {
  name: 'Timer started, needs port refresh',
  decorators: [
    (Story) => {
      withTimers(oneMinuteAgo, oneMinuteAgo)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.combinedOperation,
  },
}

export const NotReady: Story = {
  name: 'Requirements not met',
  decorators: [
    (Story) => {
      withTimers(0, 0)
      return <Story />
    },
  ],
  parameters: {
    pluginState: readmeScenarios.notReady,
  },
}
