import { describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock the timerState
vi.mock('../timer-state', () => ({
  timerState: {
    getLastNosakiRefresh: vi.fn(() => Date.now()),
    getLastRepairRefresh: vi.fn(() => Date.now()),
    subscribe: vi.fn(() => vi.fn()),
  },
}))

// Mock selectors
vi.mock('../fleet-selectors', () => ({
  createFleetBasicInfoSelector: () => () => ({
    api_id: 1,
    shipId: [101, 102],
  }),
  createFleetStatusSelector: () => () => ({
    canRepair: true,
    akashiFlagship: true,
    inExpedition: false,
    flagShipInRepair: false,
    canBoostMorale: false,
    nosakiPresent: false,
    nosakiPosition: -1,
    nosakiShipId: -1,
    repairShipFlagship: true,
    pairedRepairBonus: false,
  }),
  createFleetRepairCountSelector: () => () => 3,
  createFleetRepairDetailSelector: () => () => [
    {
      api_id: 101,
      api_ship_id: 182,
      api_name: 'Akashi',
      api_lv: 50,
      api_nowhp: 40,
      api_maxhp: 40,
      api_stype: 19,
      estimate: 0,
      timePerHP: 0,
      inRepair: false,
      availableSRF: true,
      api_cond: 49,
      canBoostMorale: false,
      moraleBoostAmount: 0,
    },
  ],
}))

import FleetList from '../fleet-list'

// Create a mock store
const createMockStore = () =>
  configureStore({
    reducer: {
      info: () => ({
        fleets: [],
        ships: {},
        equips: {},
        repairs: [],
      }),
      const: () => ({
        $ships: {},
      }),
      misc: () => ({
        canNotify: true,
      }),
    },
  })

describe('fleet-list.tsx', () => {
  afterEach(() => {
    cleanup()
  })

  describe('FleetList', () => {
    it('should render with fleet info', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <FleetList fleetId={1} />
        </Provider>,
      )

      // Should show HP Repair tag when canRepair is true
      expect(screen.getByText('HP Repair')).toBeInTheDocument()
    })

    it('should show elapsed timer', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <FleetList fleetId={1} />
        </Provider>,
      )

      expect(screen.getByText('elapsed')).toBeInTheDocument()
    })

    it('should show capacity count', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <FleetList fleetId={1} />
        </Provider>,
      )

      expect(screen.getByText('capacity-count')).toBeInTheDocument()
    })

    it('should render ship table headers', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <FleetList fleetId={1} />
        </Provider>,
      )

      expect(screen.getByText('Ship')).toBeInTheDocument()
      expect(screen.getByText('HP')).toBeInTheDocument()
    })
  })
})

// Test when fleet not found
describe('FleetList with null status', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should return null when basicInfo is not found', async () => {
    vi.doMock('../fleet-selectors', () => ({
      createFleetBasicInfoSelector: () => () => null,
      createFleetStatusSelector: () => () => null,
      createFleetRepairCountSelector: () => () => 0,
      createFleetRepairDetailSelector: () => () => [],
    }))

    // Re-import after mock
    const { default: FleetListWithNull } = await import('../fleet-list')
    const store = createMockStore()

    const { container } = render(
      <Provider store={store}>
        <FleetListWithNull fleetId={999} />
      </Provider>,
    )

    // Should render nothing
    expect(container.firstChild).toBeNull()

    cleanup()
  })
})
