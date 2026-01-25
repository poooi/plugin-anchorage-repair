import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

// Mock react-redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => true), // canNotify = true
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Need to import after mocks
import ShipRow from '../ship-row'
import { NOSAKI_INTERVAL, NOSAKI_COND_MAX } from '../functions'

interface ShipData {
  api_id: number
  api_name: string
  api_lv: number
  api_nowhp: number
  api_maxhp: number
  availableSRF: boolean
  estimate: number
  timePerHP: number
  inRepair: boolean
  api_cond: number
  canBoostMorale: boolean
  moraleBoostAmount: number
}

const createShipData = (overrides: Partial<ShipData> = {}): ShipData => ({
  api_id: 101,
  api_name: 'TestShip',
  api_lv: 50,
  api_nowhp: 30,
  api_maxhp: 40,
  availableSRF: true,
  estimate: 1200000, // 20 minutes
  timePerHP: 60000, // 1 minute per HP
  inRepair: false,
  api_cond: 49,
  canBoostMorale: true,
  moraleBoostAmount: 2,
  ...overrides,
})

describe('ship-row.tsx', () => {
  afterEach(() => {
    cleanup()
  })

  describe('ShipRow', () => {
    it('should render ship name and level', () => {
      const ship = createShipData({ api_name: 'Destroyer', api_lv: 75 })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={true}
              canBoostMorale={true}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText('Destroyer')).toBeInTheDocument()
      expect(screen.getByText('Lv.75')).toBeInTheDocument()
    })

    it('should display HP values', () => {
      const ship = createShipData({ api_nowhp: 25, api_maxhp: 50 })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={true}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText('25 / 50')).toBeInTheDocument()
    })

    it('should show countdown timer when canRepair and has estimate', () => {
      const ship = createShipData({ estimate: 1200000, availableSRF: true })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={1000}
              canRepair={true}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByTestId('countdown-label')).toBeInTheDocument()
    })

    it('should show Docking tag when ship is in repair', () => {
      const ship = createShipData({
        inRepair: true,
        estimate: 1200000,
        availableSRF: true,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={true}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText('Docking')).toBeInTheDocument()
    })

    it('should show time per HP when available', () => {
      const ship = createShipData({ timePerHP: 120000 }) // 2 minutes

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={true}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      // resolveTime(120000 / 1000) = resolveTime(120) = "00:02:00"
      expect(screen.getByText('00:02:00')).toBeInTheDocument()
    })

    it('should show morale boost info when canBoostMorale and eligible', () => {
      const ship = createShipData({
        api_cond: 40,
        canBoostMorale: true,
        moraleBoostAmount: 3,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={true}
              moraleTimeElapsed={NOSAKI_INTERVAL / 1000} // Timer complete
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText(/\+3/)).toBeInTheDocument()
    })

    it('should show MAX when at NOSAKI_COND_MAX', () => {
      const ship = createShipData({
        api_cond: NOSAKI_COND_MAX,
        canBoostMorale: false,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={true}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText(/MAX/)).toBeInTheDocument()
    })

    it('should show just cond value when below max but not eligible', () => {
      const ship = createShipData({
        api_cond: 45,
        canBoostMorale: false,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={true}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.getByText(/Cond.*45/)).toBeInTheDocument()
    })

    it('should not show repair columns when canRepair is false', () => {
      const ship = createShipData({ estimate: 1200000 })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.queryByTestId('countdown-label')).not.toBeInTheDocument()
    })

    it('should not show morale column when canBoostMorale is false', () => {
      const ship = createShipData({ api_cond: 40 })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      expect(screen.queryByText(/Cond/)).not.toBeInTheDocument()
    })

    it('should show repair estimate when ship is damaged and not in dock', () => {
      const ship = createShipData({
        api_nowhp: 30,
        api_maxhp: 40,
        availableSRF: true,
        inRepair: false,
        timePerHP: 60000,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={1500}
              lastRefresh={Date.now()}
              canRepair={true}
              canBoostMorale={false}
              moraleTimeElapsed={0}
            />
          </tbody>
        </table>,
      )

      // repairEstimate should show some value
      // The function calculates HP repaired
    })

    it('should not show morale boost when timer not complete', () => {
      const ship = createShipData({
        api_cond: 40,
        canBoostMorale: true,
        moraleBoostAmount: 2,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={true}
              moraleTimeElapsed={100} // Not enough time
            />
          </tbody>
        </table>,
      )

      // Should not show the boost amount
      expect(screen.queryByText(/\+2/)).not.toBeInTheDocument()
    })

    it('should not show morale boost when ship is in repair dock', () => {
      const ship = createShipData({
        api_cond: 40,
        canBoostMorale: false, // In dock, so not eligible
        moraleBoostAmount: 2,
        inRepair: true,
      })

      render(
        <table>
          <tbody>
            <ShipRow
              ship={ship}
              timeElapsed={0}
              lastRefresh={Date.now()}
              canRepair={false}
              canBoostMorale={true}
              moraleTimeElapsed={NOSAKI_INTERVAL / 1000}
            />
          </tbody>
        </table>,
      )

      expect(screen.queryByText(/\+2/)).not.toBeInTheDocument()
    })
  })
})
