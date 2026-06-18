import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'

import type { RootState } from '../poi-types'

import { AKASHI_INTERVAL, NOSAKI_INTERVAL } from './functions'

const SRF_ID = 86

type ShipInput = {
  id: number
  shipId: number
  name: string
  level?: number
  nowhp: number
  maxhp: number
  cond?: number
  fuel?: number
  bull?: number
  stype?: number
  ndockTime?: number
  slots?: number[]
}

type ScenarioInput = {
  ships: ShipInput[]
  repairIds?: number[]
  missionActive?: boolean
}

const srfEquip = (id: number): APIGetMemberSlotItemResponse =>
  ({
    api_id: id,
    api_slotitem_id: SRF_ID,
  }) as APIGetMemberSlotItemResponse

const ship = ({
  bull = 40,
  cond = 49,
  fuel = 40,
  id,
  level = 80,
  maxhp,
  ndockTime = 30 * 60 * 1000,
  nowhp,
  shipId,
  slots = [],
}: ShipInput): APIShip =>
  ({
    api_bull: bull,
    api_cond: cond,
    api_fuel: fuel,
    api_id: id,
    api_lv: level,
    api_maxhp: maxhp,
    api_ndock_time: nowhp >= maxhp ? 0 : ndockTime,
    api_nowhp: nowhp,
    api_ship_id: shipId,
    api_slot: slots,
  }) as APIShip

const constShip = ({
  bull = 40,
  fuel = 40,
  maxhp,
  name,
  shipId,
  stype = 2,
}: ShipInput): APIMstShip =>
  ({
    api_bull_max: bull,
    api_fuel_max: fuel,
    api_id: shipId,
    api_name: name,
    api_stype: stype,
    api_taik: [maxhp, maxhp],
  }) as APIMstShip

const repairDock = (shipId: number): APIGetMemberNdockResponse =>
  ({
    api_ship_id: shipId,
  }) as APIGetMemberNdockResponse

const fleet = (ships: ShipInput[], missionActive = false): APIDeckPort =>
  ({
    api_id: 1,
    api_mission: missionActive ? [1] : [0],
    api_ship: [...ships.map((item) => item.id), -1, -1, -1, -1, -1, -1].slice(
      0,
      7,
    ),
  }) as APIDeckPort

export const createStoryState = ({
  missionActive = false,
  repairIds = [],
  ships,
}: ScenarioInput): RootState => ({
  const: {
    $ships: Object.fromEntries(
      ships.map((item) => [item.shipId, constShip(item)]),
    ),
  },
  info: {
    equips: {
      101: srfEquip(101),
      102: srfEquip(102),
      103: srfEquip(103),
      104: srfEquip(104),
      105: srfEquip(105),
    },
    fleets: [fleet(ships, missionActive)],
    repairs: repairIds.map(repairDock),
    ships: Object.fromEntries(ships.map((item) => [item.id, ship(item)])),
  },
  misc: {
    canNotify: false,
  },
})

export const oneMinuteAgo = Date.now() - 60 * 1000

export const repairTimerReady = Date.now() - AKASHI_INTERVAL - 60 * 1000

export const moraleTimerReady = Date.now() - NOSAKI_INTERVAL - 60 * 1000

export const readmeScenarios = {
  akashiRepair: createStoryState({
    ships: [
      {
        id: 1,
        name: 'Akashi Kai',
        nowhp: 39,
        maxhp: 45,
        shipId: 187,
        slots: [101, 102],
        stype: 19,
      },
      { id: 2, name: 'Fubuki Kai Ni', nowhp: 25, maxhp: 31, shipId: 426 },
      { id: 3, name: 'Shigure Kai Ni', nowhp: 21, maxhp: 31, shipId: 145 },
      { id: 4, name: 'Mogami Kai', nowhp: 34, maxhp: 50, shipId: 73 },
      { id: 5, name: 'Ooyodo Kai', nowhp: 43, maxhp: 47, shipId: 183 },
    ],
  }),
  combinedOperation: createStoryState({
    ships: [
      {
        id: 20,
        name: 'Akashi Kai',
        nowhp: 42,
        maxhp: 45,
        shipId: 187,
        slots: [101, 102],
        stype: 19,
      },
      {
        bull: 30,
        cond: 49,
        fuel: 35,
        id: 21,
        name: 'Nosaki Kai',
        nowhp: 36,
        maxhp: 39,
        shipId: 1002,
        stype: 22,
      },
      {
        cond: 42,
        id: 22,
        name: 'Yukikaze Kai',
        nowhp: 25,
        maxhp: 32,
        shipId: 228,
      },
      {
        cond: 51,
        id: 23,
        name: 'Hamakaze Kai',
        nowhp: 30,
        maxhp: 33,
        shipId: 170,
      },
    ],
  }),
  notReady: createStoryState({
    ships: [
      {
        bull: 10,
        cond: 25,
        fuel: 12,
        id: 41,
        name: 'Nosaki Kai',
        nowhp: 25,
        maxhp: 39,
        shipId: 1002,
        stype: 22,
      },
      {
        id: 40,
        name: 'Akashi Kai',
        nowhp: 20,
        maxhp: 45,
        shipId: 187,
        slots: [101, 102],
        stype: 19,
      },
      { id: 42, name: 'Shigure Kai Ni', nowhp: 31, maxhp: 31, shipId: 145 },
    ],
  }),
  nosakiMorale: createStoryState({
    ships: [
      {
        bull: 30,
        cond: 49,
        fuel: 35,
        id: 30,
        name: 'Nosaki Kai',
        nowhp: 39,
        maxhp: 39,
        shipId: 1002,
        stype: 22,
      },
      {
        cond: 40,
        id: 31,
        name: 'Fubuki Kai Ni',
        nowhp: 31,
        maxhp: 31,
        shipId: 426,
      },
      {
        cond: 53,
        id: 32,
        name: 'Shigure Kai Ni',
        nowhp: 31,
        maxhp: 31,
        shipId: 145,
      },
      {
        cond: 54,
        id: 33,
        name: 'Ooyodo Kai',
        nowhp: 47,
        maxhp: 47,
        shipId: 183,
      },
    ],
  }),
  pairedRepairBonus: createStoryState({
    ships: [
      {
        id: 10,
        name: 'Akashi Kai',
        nowhp: 42,
        maxhp: 45,
        shipId: 187,
        slots: [101, 102, 103],
        stype: 19,
      },
      {
        id: 11,
        name: 'Asahi Kai',
        nowhp: 37,
        maxhp: 39,
        shipId: 958,
        slots: [104, 105],
        stype: 22,
      },
      { id: 12, name: 'Fubuki Kai Ni', nowhp: 25, maxhp: 31, shipId: 426 },
      { id: 13, name: 'Shigure Kai Ni', nowhp: 21, maxhp: 31, shipId: 145 },
      { id: 14, name: 'Hamakaze Kai', nowhp: 20, maxhp: 33, shipId: 170 },
      { id: 15, name: 'Ooyodo Kai', nowhp: 41, maxhp: 47, shipId: 183 },
      { id: 16, name: 'Mogami Kai', nowhp: 34, maxhp: 50, shipId: 73 },
    ],
  }),
}
