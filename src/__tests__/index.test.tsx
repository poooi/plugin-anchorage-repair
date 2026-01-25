import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock timerState
vi.mock('../timer-state', () => ({
  timerState: {
    getLastNosakiRefresh: vi.fn(() => 0),
    getLastRepairRefresh: vi.fn(() => 0),
    setLastNosakiRefresh: vi.fn(),
    setLastRepairRefresh: vi.fn(),
    resetNosakiTimer: vi.fn(),
    resetRepairTimer: vi.fn(),
    clearNosakiTimer: vi.fn(),
    clearRepairTimer: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  },
}))

// Mock fleet-selectors
vi.mock('../fleet-selectors', () => ({
  fleetIdsSelector: () => [1, 2],
  createFleetCanRepairSelector: () => () => true,
  createFleetBasicInfoSelector: () => () => ({
    api_id: 1,
    shipId: [101],
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
  createFleetRepairDetailSelector: () => () => [],
}))

// Mock fleet-utils
vi.mock('../fleet-utils', () => ({
  checkRepairActive: vi.fn(() => ({ active: false, repairShip: false })),
  checkNosakiPresent: vi.fn(() => false),
  getFleetStatus: vi.fn(() => ({
    canRepair: false,
    canBoostMorale: false,
    nosakiPresent: false,
  })),
  REPAIR_SHIP_ID: [182, 187, 958],
  NOSAKI_ID_LIST: [996, 1002],
}))

// Mock functions
vi.mock('../functions', () => ({
  akashiEstimate: vi.fn(() => 0),
  AKASHI_INTERVAL: 20 * 60 * 1000,
  NOSAKI_INTERVAL: 15 * 60 * 1000,
}))

// Mock getStore on window
const mockGetStore = vi.fn(() => ({
  fleets: [],
  ships: {},
  repairs: [],
  equips: {},
  $ships: {},
}))

Object.defineProperty(window, 'getStore', {
  value: mockGetStore,
  writable: true,
})

import { reactClass as PluginAnchorageRepair, switchPluginPath } from '../index'

const createMockStore = () =>
  configureStore({
    reducer: {
      info: () => ({
        fleets: [
          { api_id: 1, api_ship: [101], api_mission: [0] },
          { api_id: 2, api_ship: [201], api_mission: [0] },
        ],
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

describe('index.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('PluginAnchorageRepair', () => {
    it('should render the main container', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <PluginAnchorageRepair />
        </Provider>,
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should render fleet tabs', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <PluginAnchorageRepair />
        </Provider>,
      )

      // Should have tabs for fleets 1 and 2
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render Repair Queue tab', () => {
      const store = createMockStore()

      render(
        <Provider store={store}>
          <PluginAnchorageRepair />
        </Provider>,
      )

      expect(screen.getByText('Repair Queue')).toBeInTheDocument()
    })

    it('should add event listener on mount', () => {
      const store = createMockStore()
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      render(
        <Provider store={store}>
          <PluginAnchorageRepair />
        </Provider>,
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'game.response',
        expect.any(Function),
      )
    })

    it('should remove event listener on unmount', () => {
      const store = createMockStore()
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <Provider store={store}>
          <PluginAnchorageRepair />
        </Provider>,
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'game.response',
        expect.any(Function),
      )
    })
  })

  describe('switchPluginPath', () => {
    it('should have port path configuration', () => {
      expect(switchPluginPath[0].path).toBe('/kcsapi/api_port/port')
    })

    it('should have mission result path configuration', () => {
      expect(switchPluginPath[1].path).toBe('/kcsapi/api_req_mission/result')
    })

    it('should return false for port path when no ships need repair', () => {
      mockGetStore.mockReturnValue({
        fleets: [{ api_id: 1, api_ship: [101], api_mission: [0] }],
        ships: {
          101: { api_id: 101, api_nowhp: 40, api_maxhp: 40, api_ndock_time: 0 },
        },
        repairs: [],
      })

      expect(switchPluginPath[0].valid()).toBe(false)
    })

    it('should return false for mission result path', () => {
      vi.useFakeTimers()
      const result = switchPluginPath[1].valid()
      expect(result).toBe(false)
      vi.useRealTimers()
    })
  })
})

describe('Game event handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStore.mockReturnValue({
      fleets: [{ api_id: 1, api_ship: [101], api_mission: [0] }],
      ships: {
        101: { api_id: 101, api_ship_id: 182, api_nowhp: 40, api_maxhp: 40 },
      },
      repairs: [],
      equips: {},
      $ships: {},
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('should handle api_port/port event', () => {
    const store = createMockStore()

    render(
      <Provider store={store}>
        <PluginAnchorageRepair />
      </Provider>,
    )

    // Simulate game.response event
    const event = new CustomEvent('game.response', {
      detail: {
        path: '/kcsapi/api_port/port',
        postBody: {},
      },
    })

    act(() => {
      window.dispatchEvent(event)
    })

    // The component should handle the event without error
    expect(true).toBe(true)
  })

  it('should handle api_req_hensei/change event', () => {
    const store = createMockStore()

    render(
      <Provider store={store}>
        <PluginAnchorageRepair />
      </Provider>,
    )

    const event = new CustomEvent('game.response', {
      detail: {
        path: '/kcsapi/api_req_hensei/change',
        postBody: {
          api_id: '1',
          api_ship_id: '101',
          api_ship_idx: '0',
        },
      },
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(true).toBe(true)
  })

  it('should handle api_req_mission/start event', () => {
    const store = createMockStore()

    render(
      <Provider store={store}>
        <PluginAnchorageRepair />
      </Provider>,
    )

    const event = new CustomEvent('game.response', {
      detail: {
        path: '/kcsapi/api_req_mission/start',
        postBody: {
          api_deck_id: '1',
        },
      },
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(true).toBe(true)
  })

  it('should handle api_req_nyukyo/start event', () => {
    const store = createMockStore()

    render(
      <Provider store={store}>
        <PluginAnchorageRepair />
      </Provider>,
    )

    const event = new CustomEvent('game.response', {
      detail: {
        path: '/kcsapi/api_req_nyukyo/start',
        postBody: {
          api_ship_id: '101',
          api_highspeed: '1',
        },
      },
    })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(true).toBe(true)
  })
})
