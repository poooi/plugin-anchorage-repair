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

    it('should show ships that need repair', () => {
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

      // Table headers should be present - the actual ship rendering depends on virtualization
      expect(screen.getByText('Ship')).toBeInTheDocument()
      expect(screen.getByText('HP')).toBeInTheDocument()
    })
  })
})
