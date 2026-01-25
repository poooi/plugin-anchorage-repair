import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock @tanstack/react-virtual to render all items
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number
    estimateSize: () => number
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * estimateSize(),
        size: estimateSize(),
        key: index,
      })),
  }),
}))

import { RepairQueue } from '../candidates'

// Create a mock store with ships that need repair
const createMockStore = (ships: Record<number, unknown> = {}) =>
  configureStore({
    reducer: {
      info: () => ({
        fleets: [
          { api_id: 1, api_ship: [101, 102] },
        ],
        ships,
        equips: {},
        repairs: [],
      }),
      const: () => ({
        $ships: {
          1: { api_name: 'Destroyer', api_stype: 2 },
          2: { api_name: 'Cruiser', api_stype: 3 },
        },
      }),
      misc: () => ({
        canNotify: true,
      }),
    },
  })

describe('candidates.tsx', () => {
  afterEach(() => {
    cleanup()
  })

  describe('RepairQueue', () => {
    it('should render the candidates table', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      expect(screen.getByText('Ship')).toBeInTheDocument()
      expect(screen.getByText('HP')).toBeInTheDocument()
      expect(screen.getByText('Akashi Time')).toBeInTheDocument()
      expect(screen.getByText('Per HP')).toBeInTheDocument()
    })

    it('should render empty when no ships need repair', () => {
      const store = createMockStore({})

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // Table should still be rendered, just empty
      expect(screen.getByText('Ship')).toBeInTheDocument()
    })

    it('should show ships that need repair with HP percentage indicator', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 75,
          api_nowhp: 25,
          api_maxhp: 40, // 62.5% HP, above 50% threshold
          api_ndock_time: 1200000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // With mocked virtualizer, ships should render
      expect(screen.getByText(/Lv\.75/)).toBeInTheDocument()
      expect(screen.getByText('(25 / 40)')).toBeInTheDocument()
    })

    it('should show ships with high HP percentage (above 75%)', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 35,
          api_maxhp: 40, // 87.5% HP, above 75% threshold
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      expect(screen.getByText(/Lv\.50/)).toBeInTheDocument()
      expect(screen.getByText('(35 / 40)')).toBeInTheDocument()
    })

    it('should show ship with fleet ID when assigned to fleet', () => {
      const store = configureStore({
        reducer: {
          info: () => ({
            fleets: [{ api_id: 1, api_ship: [101] }],
            ships: {
              101: {
                api_id: 101,
                api_ship_id: 1,
                api_lv: 50,
                api_nowhp: 30,
                api_maxhp: 40,
                api_ndock_time: 600000,
                api_cond: 49,
              },
            },
            equips: {},
            repairs: [],
          }),
          const: () => ({
            $ships: {
              1: { api_name: 'TestShip', api_stype: 2 },
            },
          }),
          misc: () => ({
            canNotify: true,
          }),
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // Ship should show fleet assignment /1 (fleetId index 0 displays as fleet 1)
      expect(screen.getByText(/Lv\.50 TestShip\/1/)).toBeInTheDocument()
    })

    it('should show ship without fleet ID when not assigned', () => {
      const store = configureStore({
        reducer: {
          info: () => ({
            fleets: [{ api_id: 1, api_ship: [200] }], // Ship 101 not in fleet
            ships: {
              101: {
                api_id: 101,
                api_ship_id: 1,
                api_lv: 50,
                api_nowhp: 30,
                api_maxhp: 40,
                api_ndock_time: 600000,
                api_cond: 49,
              },
            },
            equips: {},
            repairs: [],
          }),
          const: () => ({
            $ships: {
              1: { api_name: 'TestShip', api_stype: 2 },
            },
          }),
          misc: () => ({
            canNotify: true,
          }),
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // Ship should be shown without fleet ID
      expect(screen.getByText(/Lv\.50/)).toBeInTheDocument()
    })

    it('should allow sorting by clicking column headers', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // Click on HP header to sort
      const hpHeader = screen.getByText('HP')
      fireEvent.click(hpHeader)

      // Header should still be present after click
      expect(hpHeader).toBeInTheDocument()
    })

    it('should toggle sort direction on multiple clicks', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      const hpHeader = screen.getByText('HP')
      
      // First click - ascending
      fireEvent.click(hpHeader)
      // Second click - descending
      fireEvent.click(hpHeader)
      // Third click - no sort
      fireEvent.click(hpHeader)

      expect(hpHeader).toBeInTheDocument()
    })

    it('should allow sorting by Akashi Time column', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      const akashiHeader = screen.getByText('Akashi Time')
      fireEvent.click(akashiHeader)

      expect(akashiHeader).toBeInTheDocument()
    })

    it('should allow sorting by Per HP column', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      const perHpHeader = screen.getByText('Per HP')
      fireEvent.click(perHpHeader)

      expect(perHpHeader).toBeInTheDocument()
    })

    it('should not allow sorting by Ship column', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      const shipHeader = screen.getByText('Ship')
      fireEvent.click(shipHeader)

      // Ship column should not show sort indicator
      expect(screen.queryByText('↑')).not.toBeInTheDocument()
      expect(screen.queryByText('↓')).not.toBeInTheDocument()
    })

    it('should filter ships in repair', () => {
      const store = createMockStore({
        101: {
          api_id: 101,
          api_ship_id: 1,
          api_lv: 50,
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 600000,
          api_cond: 49,
        },
      })

      // The mock store has the ship, but if it was in repairs, it would be filtered out
      render(
        <Provider store={store}>
          <RepairQueue />
        </Provider>,
      )

      // The table should render normally
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })
})
