import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'

import { describe, expect, it } from 'vitest'

import {
  getFleetRepairCount,
  getFleetRepairDetail,
  getFleetStatus,
} from './fleet-utils'
import { getTimePerHP, PAIRED_REPAIR_TIME_MULTIPLIER } from './functions'

const srfEquip = (id: number): APIGetMemberSlotItemResponse =>
  ({
    api_id: id,
    api_slotitem_id: 86,
  }) as APIGetMemberSlotItemResponse

const ship = ({
  id,
  maxhp,
  ndockTime = 30 * 60 * 1000,
  nowhp,
  shipId,
  slots = [],
}: {
  id: number
  maxhp: number
  ndockTime?: number
  nowhp: number
  shipId: number
  slots?: number[]
}): APIShip =>
  ({
    api_bull: 40,
    api_cond: 49,
    api_fuel: 40,
    api_id: id,
    api_lv: 80,
    api_maxhp: maxhp,
    api_ndock_time: ndockTime,
    api_nowhp: nowhp,
    api_ship_id: shipId,
    api_slot: slots,
  }) as APIShip

const constShip = ({
  id,
  name,
  stype,
}: {
  id: number
  name: string
  stype: number
}): APIMstShip => ({
  api_ctype: 0,
  api_id: id,
  api_name: name,
  api_slot_num: 0,
  api_soku: 0,
  api_sort_id: id,
  api_stype: stype,
  api_yomi: '',
})

describe('getFleetRepairDetail', () => {
  it('applies paired repair to both total time and per-HP time', () => {
    const fleet = {
      api_id: 1,
      api_mission: [0],
      api_ship: [10, 11, 12, -1, -1, -1],
    } as APIDeckPort
    const ships = {
      10: ship({
        id: 10,
        maxhp: 45,
        nowhp: 42,
        shipId: 187,
        slots: [101],
      }),
      11: ship({
        id: 11,
        maxhp: 39,
        nowhp: 39,
        shipId: 958,
        slots: [102],
      }),
      12: ship({
        id: 12,
        maxhp: 31,
        nowhp: 25,
        shipId: 426,
      }),
    }
    const constShips: Record<number, APIMstShip> = {
      187: constShip({ id: 187, name: '明石改', stype: 19 }),
      426: constShip({ id: 426, name: '吹雪改二', stype: 2 }),
      958: constShip({ id: 958, name: '朝日改', stype: 22 }),
    }
    const equips = {
      101: srfEquip(101),
      102: srfEquip(102),
    }

    const status = getFleetStatus(fleet, ships, constShips, [], equips)
    const repairCount = getFleetRepairCount(fleet, ships, equips, [])
    const repairDetail = getFleetRepairDetail(
      fleet,
      constShips,
      ships,
      [],
      repairCount,
      status.nosakiShipId,
      status.pairedRepairBonus,
    )
    const targetShip = repairDetail.find(({ api_id }) => api_id === 12)

    expect(status.pairedRepairBonus).toBe(true)
    expect(targetShip?.estimate).toBe(25 * 60 * 1000)
    expect(targetShip?.timePerHP).toBe(
      getTimePerHP(80, 2) * PAIRED_REPAIR_TIME_MULTIPLIER,
    )
  })
})
