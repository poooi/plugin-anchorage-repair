import _ from 'lodash'
import { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import { akashiEstimate, getTimePerHP } from './functions'

export const AKASHI_ID = [182, 187] // akashi, akashi kai ID in $ships
export const NOSAKI_ID = [996, 1002] // nosaki, nosaki kai ID in $ships
export const REPAIR_SHIP_ID = [...AKASHI_ID, ...NOSAKI_ID] // all repair ships
export const SRF_ID = 86 // Ship Repair Facility ID in $slotitems

export type FleetBasicInfo = {
  api_id: number
  shipId: number[]
}

export type FleetStatus = {
  canRepair: boolean
  akashiFlagship: boolean
  inExpedition: boolean
  flagShipInRepair: boolean
}

export type ShipRepairDetail = {
  api_id: number
  api_ship_id: number
  api_lv: number
  api_nowhp: number
  api_maxhp: number
  api_ndock_time: number
  api_name: string
  api_stype: number
  estimate: number
  timePerHP: number
  inRepair: boolean
  availableSRF: boolean
}

export const getFleetBasicInfo = (fleet: APIDeckPort): FleetBasicInfo => ({
  api_id: fleet.api_id || -1,
  shipId: fleet.api_ship || [],
})

export const getFleetStatus = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  repairId: number[],
): FleetStatus => {
  const inExpedition = Boolean(_.get(fleet, 'api_mission.0'))
  const flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  let akashiFlagship = false
  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
  }

  const canRepair = akashiFlagship && !inExpedition && !flagShipInRepair

  return {
    canRepair,
    akashiFlagship,
    inExpedition,
    flagShipInRepair,
  }
}

export const getFleetRepairCount = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  equips: Record<number, APIGetMemberSlotItemResponse>,
): number => {
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]
  if (!flagship) return 0

  const akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
  const srfCount = _.filter(
    flagship.api_slot,
    (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
  ).length

  return srfCount + (akashiFlagship ? 2 : 0)
}

export const getFleetRepairDetail = (
  fleet: APIDeckPort,
  $ships: Record<number, APIMstShip>,
  ships: Record<number, APIShip>,
  repairId: number[],
  repairCount: number,
): ShipRepairDetail[] => {
  const pickKey: (keyof APIShip)[] = [
    'api_id',
    'api_ship_id',
    'api_lv',
    'api_nowhp',
    'api_maxhp',
    'api_ndock_time',
  ]

  return _.map(
    _.filter(fleet.api_ship, (shipId) => shipId > 0),
    (shipId, index) => {
      const ship = _.pick(ships[shipId], pickKey)
      const constShip = _.pick($ships[ship.api_ship_id], [
        'api_name',
        'api_stype',
      ])

      return {
        ...ship,
        ...constShip,
        estimate: akashiEstimate(ship),
        timePerHP: getTimePerHP(ship.api_lv, constShip.api_stype),
        inRepair: _.includes(repairId, ship.api_id),
        availableSRF: index < repairCount,
      }
    },
  )
}

export const canFleetRepair = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  repairId: number[],
): boolean => {
  const status = getFleetStatus(fleet, ships, repairId)
  return status.canRepair
}
