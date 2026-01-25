import { describe, it, expect } from 'vitest'
import type { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import type { RootState } from '../../poi-types'

import {
  createFleetBasicInfoSelector,
  createFleetStatusSelector,
  createFleetRepairCountSelector,
  createFleetRepairDetailSelector,
  createFleetCanRepairSelector,
  fleetIdsSelector,
} from '../fleet-selectors'

// Helper to create a minimal fleet
const createFleet = (
  api_id: number,
  api_ship: number[],
  api_mission: number[] = [0],
): APIDeckPort =>
  ({
    api_id,
    api_ship,
    api_mission,
  }) as APIDeckPort

// Helper to create a minimal ship
const createShip = (
  api_id: number,
  api_ship_id: number,
  api_nowhp: number,
  api_maxhp: number,
  api_slot: number[] = [],
  api_lv: number = 50,
  api_ndock_time: number = 100000,
  api_cond: number = 49,
  api_fuel: number = 100,
  api_bull: number = 100,
): APIShip =>
  ({
    api_id,
    api_ship_id,
    api_nowhp,
    api_maxhp,
    api_slot,
    api_lv,
    api_ndock_time,
    api_cond,
    api_fuel,
    api_bull,
  }) as APIShip

// Helper to create a minimal const ship
const createConstShip = (
  api_name: string,
  api_stype: number,
  api_fuel_max: number = 100,
  api_bull_max: number = 100,
): APIMstShip =>
  ({
    api_name,
    api_stype,
    api_fuel_max,
    api_bull_max,
  }) as APIMstShip

// Helper to create slot item
const createSlotItem = (
  api_id: number,
  api_slotitem_id: number,
): APIGetMemberSlotItemResponse =>
  ({
    api_id,
    api_slotitem_id,
  }) as APIGetMemberSlotItemResponse

// Helper to create a repair dock
const createRepairDock = (api_ship_id: number): APIGetMemberNdockResponse =>
  ({
    api_ship_id,
  }) as APIGetMemberNdockResponse

// Helper to create state
const createState = (
  fleets: APIDeckPort[],
  ships: Record<number, APIShip>,
  $ships: Record<number, APIMstShip>,
  equips: Record<number, APIGetMemberSlotItemResponse> = {},
  repairs: APIGetMemberNdockResponse[] = [],
): RootState =>
  ({
    info: {
      fleets,
      ships,
      equips,
      repairs,
    },
    const: {
      $ships,
    },
    misc: {
      canNotify: true,
    },
  }) as RootState

describe('fleet-selectors.ts', () => {
  describe('fleetIdsSelector', () => {
    it('should return fleet IDs', () => {
      const state = createState(
        [createFleet(1, [101]), createFleet(2, [201])],
        {},
        {},
      )

      const result = fleetIdsSelector(state)

      expect(result).toEqual([1, 2])
    })

    it('should return -1 for fleets without api_id', () => {
      const fleet = { api_ship: [101] } as APIDeckPort
      const state = createState([fleet], {}, {})

      const result = fleetIdsSelector(state)

      expect(result).toEqual([-1])
    })

    it('should return empty array when no fleets', () => {
      const state = createState([], {}, {})

      const result = fleetIdsSelector(state)

      expect(result).toEqual([])
    })
  })

  describe('createFleetBasicInfoSelector', () => {
    it('should return basic info for existing fleet', () => {
      const state = createState([createFleet(1, [101, 102])], {}, {})

      const selector = createFleetBasicInfoSelector(1)
      const result = selector(state)

      expect(result).toEqual({
        api_id: 1,
        shipId: [101, 102],
      })
    })

    it('should return null for non-existent fleet', () => {
      const state = createState([createFleet(1, [101])], {}, {})

      const selector = createFleetBasicInfoSelector(999)
      const result = selector(state)

      expect(result).toBeNull()
    })
  })

  describe('createFleetStatusSelector', () => {
    it('should return status for existing fleet with Akashi', () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
      }
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }
      const state = createState([createFleet(1, [101])], ships, $ships)

      const selector = createFleetStatusSelector(1)
      const result = selector(state)

      expect(result).not.toBeNull()
      expect(result?.canRepair).toBe(true)
      expect(result?.akashiFlagship).toBe(true)
    })

    it('should return null for non-existent fleet', () => {
      const state = createState([], {}, {})

      const selector = createFleetStatusSelector(999)
      const result = selector(state)

      expect(result).toBeNull()
    })
  })

  describe('createFleetRepairCountSelector', () => {
    it('should return repair count for fleet with Akashi', () => {
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]), // Akashi with 1 SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
      }
      const state = createState([createFleet(1, [101])], ships, {}, equips)

      const selector = createFleetRepairCountSelector(1)
      const result = selector(state)

      expect(result).toBe(3) // 2 base + 1 SRF
    })

    it('should return 0 for non-existent fleet', () => {
      const state = createState([], {}, {})

      const selector = createFleetRepairCountSelector(999)
      const result = selector(state)

      expect(result).toBe(0)
    })
  })

  describe('createFleetRepairDetailSelector', () => {
    it('should return repair details for fleet ships', () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
        1: createConstShip('駆逐艦', 2),
      }
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40, [], 50, 600000),
      }
      const state = createState([createFleet(1, [101, 102])], ships, $ships)

      const selector = createFleetRepairDetailSelector(1)
      const result = selector(state)

      expect(result).toHaveLength(2)
      expect(result[0].api_id).toBe(101)
      expect(result[1].api_id).toBe(102)
    })

    it('should return empty array for non-existent fleet', () => {
      const state = createState([], {}, {})

      const selector = createFleetRepairDetailSelector(999)
      const result = selector(state)

      expect(result).toEqual([])
    })
  })

  describe('createFleetCanRepairSelector', () => {
    it('should return true when fleet can repair', () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
      }
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }
      const state = createState([createFleet(1, [101])], ships, $ships)

      const selector = createFleetCanRepairSelector(1)
      const result = selector(state)

      expect(result).toBe(true)
    })

    it('should return false when fleet cannot repair', () => {
      const $ships: Record<number, APIMstShip> = {
        1: createConstShip('駆逐艦', 2),
      }
      const ships: Record<number, APIShip> = {
        101: createShip(101, 1, 40, 40), // Not a repair ship
      }
      const state = createState([createFleet(1, [101])], ships, $ships)

      const selector = createFleetCanRepairSelector(1)
      const result = selector(state)

      expect(result).toBe(false)
    })

    it('should return false for non-existent fleet', () => {
      const state = createState([], {}, {})

      const selector = createFleetCanRepairSelector(999)
      const result = selector(state)

      expect(result).toBe(false)
    })
  })

  describe('Selector memoization', () => {
    it('should return same reference for same state', () => {
      const state = createState([createFleet(1, [101])], {}, {})

      const selector = createFleetBasicInfoSelector(1)
      const result1 = selector(state)
      const result2 = selector(state)

      expect(result1).toBe(result2)
    })

    it('should return new reference for changed state', () => {
      const state1 = createState([createFleet(1, [101])], {}, {})
      const state2 = createState([createFleet(1, [101, 102])], {}, {})

      const selector = createFleetBasicInfoSelector(1)
      const result1 = selector(state1)
      const result2 = selector(state2)

      expect(result1).not.toBe(result2)
      expect(result2?.shipId).toEqual([101, 102])
    })
  })
})
