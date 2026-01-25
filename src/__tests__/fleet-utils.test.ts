import { describe, it, expect } from 'vitest'
import type { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import {
  AKASHI_ID,
  ASAHI_KAI_ID,
  REPAIR_SHIP_ID,
  NOSAKI_ID_LIST,
  SRF_ID,
  getFleetBasicInfo,
  checkRepairActive,
  checkNosakiPresent,
  getFleetStatus,
  getFleetRepairCount,
  getFleetRepairDetail,
  canFleetRepair,
} from '../fleet-utils'

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

describe('fleet-utils.ts', () => {
  describe('Constants', () => {
    it('should have correct AKASHI_ID values', () => {
      expect(AKASHI_ID).toEqual([182, 187])
    })

    it('should have correct ASAHI_KAI_ID value', () => {
      expect(ASAHI_KAI_ID).toBe(958)
    })

    it('should have correct REPAIR_SHIP_ID values', () => {
      expect(REPAIR_SHIP_ID).toEqual([182, 187, 958])
    })

    it('should have correct NOSAKI_ID_LIST values', () => {
      expect(NOSAKI_ID_LIST).toEqual([996, 1002])
    })

    it('should have correct SRF_ID value', () => {
      expect(SRF_ID).toBe(86)
    })
  })

  describe('getFleetBasicInfo', () => {
    it('should extract basic info from fleet', () => {
      const fleet = createFleet(1, [101, 102, 103])
      const result = getFleetBasicInfo(fleet)
      expect(result).toEqual({
        api_id: 1,
        shipId: [101, 102, 103],
      })
    })

    it('should handle missing api_id', () => {
      const fleet = { api_ship: [101] } as APIDeckPort
      const result = getFleetBasicInfo(fleet)
      expect(result.api_id).toBe(-1)
    })

    it('should handle missing api_ship', () => {
      const fleet = { api_id: 1 } as APIDeckPort
      const result = getFleetBasicInfo(fleet)
      expect(result.shipId).toEqual([])
    })
  })

  describe('checkRepairActive', () => {
    it('should return inactive when flagship is not found', () => {
      const fleet = createFleet(1, [999])
      const ships: Record<number, APIShip> = {}
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(false)
      expect(result.repairShip).toBe(false)
      expect(result.flagship).toBeUndefined()
    })

    it('should return inactive when flagship is not a repair ship', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 1, 30, 40), // Not a repair ship
      }
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(false)
      expect(result.repairShip).toBe(false)
    })

    it('should return active when Akashi is healthy flagship', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40), // Akashi at full HP
      }
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(true)
      expect(result.repairShip).toBe(true)
    })

    it('should return inactive when flagship is in repair dock', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }
      const result = checkRepairActive(fleet, ships, [101])
      expect(result.active).toBe(false)
    })

    it('should return inactive when fleet is in expedition', () => {
      const fleet = createFleet(1, [101], [1])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(false)
    })

    it('should return inactive when flagship is moderately damaged', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 20, 40), // 50% HP
      }
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(false)
    })

    it('should return active when Asahi Kai has SRF', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 958, 40, 40, [1001]), // Asahi Kai with SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86), // SRF
      }
      const result = checkRepairActive(fleet, ships, [], equips)
      expect(result.active).toBe(true)
    })

    it('should return inactive when Asahi Kai has no SRF', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 958, 40, 40, [1001]), // Asahi Kai without SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 1), // Not SRF
      }
      const result = checkRepairActive(fleet, ships, [], equips)
      expect(result.active).toBe(false)
    })

    it('should return inactive when Asahi Kai has no equips provided', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 958, 40, 40, [1001]),
      }
      const result = checkRepairActive(fleet, ships, [])
      expect(result.active).toBe(false)
    })
  })

  describe('checkNosakiPresent', () => {
    it('should return false when no ships', () => {
      const fleet = createFleet(1, [-1])
      const ships: Record<number, APIShip> = {}
      expect(checkNosakiPresent(fleet, ships)).toBe(false)
    })

    it('should return true when Nosaki is flagship', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40), // Nosaki
      }
      expect(checkNosakiPresent(fleet, ships)).toBe(true)
    })

    it('should return true when Nosaki Kai is in second position', () => {
      const fleet = createFleet(1, [100, 101])
      const ships: Record<number, APIShip> = {
        100: createShip(100, 1, 30, 40),
        101: createShip(101, 1002, 40, 40), // Nosaki Kai
      }
      expect(checkNosakiPresent(fleet, ships)).toBe(true)
    })

    it('should return false when Nosaki is in third position', () => {
      const fleet = createFleet(1, [100, 101, 102])
      const ships: Record<number, APIShip> = {
        100: createShip(100, 1, 30, 40),
        101: createShip(101, 2, 30, 40),
        102: createShip(102, 996, 40, 40), // Nosaki in position 3
      }
      expect(checkNosakiPresent(fleet, ships)).toBe(false)
    })

    it('should return false when no Nosaki in fleet', () => {
      const fleet = createFleet(1, [100, 101])
      const ships: Record<number, APIShip> = {
        100: createShip(100, 1, 30, 40),
        101: createShip(101, 2, 30, 40),
      }
      expect(checkNosakiPresent(fleet, ships)).toBe(false)
    })
  })

  describe('getFleetStatus', () => {
    const createTestSetup = () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
        187: createConstShip('明石改', 19),
        958: createConstShip('朝日改', 19),
        996: createConstShip('野埼', 22, 100, 100),
        1002: createConstShip('野埼改', 22, 100, 100),
        1: createConstShip('駆逐艦', 2),
      }
      return { $ships }
    }

    it('should return correct status when Akashi is active flagship', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40), // Akashi
        102: createShip(102, 1, 30, 40),
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.canRepair).toBe(true)
      expect(status.akashiFlagship).toBe(true)
      expect(status.repairShipFlagship).toBe(true)
      expect(status.inExpedition).toBe(false)
      expect(status.flagShipInRepair).toBe(false)
    })

    it('should detect Nosaki in flagship position', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40, [], 50, 0, 40, 100, 100), // Nosaki
        102: createShip(102, 1, 30, 40),
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.nosakiPresent).toBe(true)
      expect(status.nosakiPosition).toBe(0)
      expect(status.nosakiShipId).toBe(996)
      expect(status.canBoostMorale).toBe(true)
    })

    it('should detect Nosaki in second position', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [100, 101])
      const ships: Record<number, APIShip> = {
        100: createShip(100, 182, 40, 40), // Akashi
        101: createShip(101, 996, 40, 40, [], 50, 0, 40, 100, 100), // Nosaki
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.nosakiPresent).toBe(true)
      expect(status.nosakiPosition).toBe(1)
      expect(status.nosakiShipId).toBe(996)
    })

    it('should not allow morale boost when Nosaki is damaged', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        // HP 30/40 = 75%, exactly at threshold, should NOT be healthy
        101: createShip(101, 996, 30, 40, [], 50, 0, 40, 100, 100),
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.nosakiPresent).toBe(true)
      expect(status.canBoostMorale).toBe(false)
    })

    it('should not allow morale boost when Nosaki is not fully supplied', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40, [], 50, 0, 40, 50, 100), // Low fuel
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.nosakiPresent).toBe(true)
      expect(status.canBoostMorale).toBe(false)
    })

    it('should not allow morale boost when Nosaki has low morale', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40, [], 50, 0, 29, 100, 100), // Low cond
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      expect(status.nosakiPresent).toBe(true)
      expect(status.canBoostMorale).toBe(false)
    })

    it('should not allow morale boost when Nosaki is in repair dock', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40, [], 50, 0, 40, 100, 100),
      }

      const status = getFleetStatus(fleet, ships, $ships, [101])

      expect(status.nosakiPresent).toBe(true)
      expect(status.canBoostMorale).toBe(false)
    })

    it('should return nosakiPresent false when $ships is missing const data for Nosaki', () => {
      // $ships is empty - missing const data for Nosaki
      const $ships: Record<number, APIMstShip> = {}
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40, [], 50, 0, 40, 100, 100),
      }

      const status = getFleetStatus(fleet, ships, $ships, [])

      // Nosaki should not be detected when const data is missing
      expect(status.nosakiPresent).toBe(false)
      expect(status.nosakiPosition).toBe(-1)
      expect(status.canBoostMorale).toBe(false)
    })

    it('should detect paired repair bonus (Akashi + Asahi Kai)', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]), // Akashi with SRF
        102: createShip(102, 958, 40, 40, [1002]), // Asahi Kai with SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const status = getFleetStatus(fleet, ships, $ships, [], equips)

      expect(status.pairedRepairBonus).toBe(true)
    })

    it('should detect paired repair bonus (Asahi Kai + Akashi)', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 958, 40, 40, [1001]), // Asahi Kai with SRF
        102: createShip(102, 182, 40, 40, [1002]), // Akashi with SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const status = getFleetStatus(fleet, ships, $ships, [], equips)

      expect(status.pairedRepairBonus).toBe(true)
    })

    it('should not have paired bonus when second ship is damaged', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]),
        102: createShip(102, 958, 30, 40, [1002]), // 75% HP - exactly at threshold
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const status = getFleetStatus(fleet, ships, $ships, [], equips)

      expect(status.pairedRepairBonus).toBe(false)
    })

    it('should not have paired bonus when second ship has no SRF', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]),
        102: createShip(102, 958, 40, 40, [1002]),
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 1), // Not SRF
      }

      const status = getFleetStatus(fleet, ships, $ships, [], equips)

      expect(status.pairedRepairBonus).toBe(false)
    })

    it('should not have paired bonus when both are Akashi', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]),
        102: createShip(102, 187, 40, 40, [1002]), // Akashi Kai, not Asahi Kai
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const status = getFleetStatus(fleet, ships, $ships, [], equips)

      expect(status.pairedRepairBonus).toBe(false)
    })
  })

  describe('getFleetRepairCount', () => {
    it('should return 0 when repairs not active', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 1, 40, 40), // Not a repair ship
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {}

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(0)
    })

    it('should return 2 + SRF count for Akashi', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001, 1002]), // Akashi with 2 SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(4) // 2 base + 2 SRF
    })

    it('should return 0 + SRF count for Asahi Kai', () => {
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 958, 40, 40, [1001]), // Asahi Kai with 1 SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
      }

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(1) // 0 base + 1 SRF
    })

    it('should add SRF from second ship when paired correctly', () => {
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]), // Akashi with 1 SRF
        102: createShip(102, 958, 40, 40, [1002]), // Asahi Kai with 1 SRF
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(4) // 2 base + 1 flagship SRF + 1 second ship SRF
    })

    it('should not add SRF from second ship when second is damaged', () => {
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]),
        102: createShip(102, 958, 30, 40, [1002]), // Damaged (75%)
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(3) // 2 base + 1 flagship SRF only
    })

    it('should not add SRF when invalid pairing', () => {
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40, [1001]),
        102: createShip(102, 187, 40, 40, [1002]), // Akashi Kai, not Asahi Kai
      }
      const equips: Record<number, APIGetMemberSlotItemResponse> = {
        1001: createSlotItem(1001, 86),
        1002: createSlotItem(1002, 86),
      }

      const count = getFleetRepairCount(fleet, ships, equips, [])
      expect(count).toBe(3) // 2 base + 1 flagship SRF only
    })
  })

  describe('getFleetRepairDetail', () => {
    const createTestSetup = () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
        1: createConstShip('駆逐艦', 2),
        996: createConstShip('野埼', 22),
      }
      return { $ships }
    }

    it('should return ship details with repair estimates', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40, [], 50, 600000), // Damaged destroyer
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [], 2)

      expect(details).toHaveLength(2)
      expect(details[0].api_id).toBe(101)
      expect(details[0].api_name).toBe('明石')
      expect(details[0].availableSRF).toBe(true)

      expect(details[1].api_id).toBe(102)
      expect(details[1].api_name).toBe('駆逐艦')
      expect(details[1].availableSRF).toBe(true)
      expect(details[1].estimate).toBeGreaterThan(0)
    })

    it('should mark ships beyond repair count as unavailable', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102, 103])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40),
        103: createShip(103, 1, 30, 40),
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [], 2)

      expect(details[0].availableSRF).toBe(true)
      expect(details[1].availableSRF).toBe(true)
      expect(details[2].availableSRF).toBe(false)
    })

    it('should mark ships in repair dock', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40),
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [102], 2)

      expect(details[1].inRepair).toBe(true)
    })

    it('should calculate morale boost for eligible ships', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40), // Nosaki
        102: createShip(102, 1, 30, 40, [], 50, 100000, 40), // Eligible ship
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [], 2, 996)

      // Nosaki herself should not receive boost
      expect(details[0].canBoostMorale).toBe(false)
      // Regular ship can receive boost
      expect(details[1].canBoostMorale).toBe(true)
      expect(details[1].moraleBoostAmount).toBe(2)
    })

    it('should apply paired repair bonus to timePerHP', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40, [], 50),
      }

      const detailsWithoutBonus = getFleetRepairDetail(
        fleet,
        $ships,
        ships,
        [],
        2,
        -1,
        false,
      )
      const detailsWithBonus = getFleetRepairDetail(
        fleet,
        $ships,
        ships,
        [],
        2,
        -1,
        true,
      )

      // Second ship's timePerHP should be 15% faster with bonus
      expect(detailsWithBonus[1].timePerHP).toBe(
        detailsWithoutBonus[1].timePerHP * 0.85,
      )
    })

    it('should not boost morale for ships in repair dock', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 996, 40, 40),
        102: createShip(102, 1, 30, 40, [], 50, 100000, 40),
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [102], 2, 996)

      expect(details[1].canBoostMorale).toBe(false)
    })

    it('should filter out invalid ship IDs', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101, -1, 102])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
        102: createShip(102, 1, 30, 40),
      }

      const details = getFleetRepairDetail(fleet, $ships, ships, [], 2)

      expect(details).toHaveLength(2)
    })
  })

  describe('canFleetRepair', () => {
    const createTestSetup = () => {
      const $ships: Record<number, APIMstShip> = {
        182: createConstShip('明石', 19),
        1: createConstShip('駆逐艦', 2),
      }
      return { $ships }
    }

    it('should return true when fleet can repair', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }

      expect(canFleetRepair(fleet, ships, $ships, [])).toBe(true)
    })

    it('should return false when fleet cannot repair', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 1, 40, 40), // Not a repair ship
      }

      expect(canFleetRepair(fleet, ships, $ships, [])).toBe(false)
    })

    it('should return false when in expedition', () => {
      const { $ships } = createTestSetup()
      const fleet = createFleet(1, [101], [1])
      const ships: Record<number, APIShip> = {
        101: createShip(101, 182, 40, 40),
      }

      expect(canFleetRepair(fleet, ships, $ships, [])).toBe(false)
    })
  })
})
