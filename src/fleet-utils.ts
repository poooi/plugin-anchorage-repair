import _ from 'lodash'
import { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import { akashiEstimate, getTimePerHP, nosakiMoraleEstimate, NOSAKI_ID, NOSAKI_KAI_ID, PAIRED_REPAIR_TIME_MULTIPLIER } from './functions'

export const AKASHI_ID = [182, 187] // akashi, akashi kai ID in $ships
export const ASAHI_KAI_ID = 958 // asahi kai ID in $ships
export const REPAIR_SHIP_ID = [182, 187, 958] // akashi, akashi kai, asahi kai
export const NOSAKI_ID_LIST = [NOSAKI_ID, NOSAKI_KAI_ID] // nosaki, nosaki kai ID in $ships
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
  canBoostMorale: boolean
  nosakiPresent: boolean // Nosaki is in position 1 or 2 (may not be eligible yet)
  nosakiPosition: number // -1 if not present, 0 for flagship, 1 for second position
  nosakiShipId: number // 996 or 1002, or -1 if not present
  repairShipFlagship: boolean // Any repair ship (Akashi or Asahi Kai) is flagship
  pairedRepairBonus: boolean // Akashi/Asahi Kai paired at positions 1-2 with SRF on position 2
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
  api_cond: number
  api_fuel: number
  api_bull: number
  canBoostMorale: boolean
  moraleBoostAmount: number
}

export const getFleetBasicInfo = (fleet: APIDeckPort): FleetBasicInfo => ({
  api_id: fleet.api_id || -1,
  shipId: fleet.api_ship || [],
})

export const getFleetStatus = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  $ships: Record<number, APIMstShip>,
  repairId: number[],
  equips?: Record<number, APIGetMemberSlotItemResponse>,
): FleetStatus => {
  const inExpedition = Boolean(_.get(fleet, 'api_mission.0'))
  const flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  let akashiFlagship = false
  let repairShipFlagship = false
  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
    repairShipFlagship = _.includes(REPAIR_SHIP_ID, flagship.api_ship_id)
  }

  const canRepair = repairShipFlagship && !inExpedition && !flagShipInRepair

  // Check for paired repair bonus: Akashi/Asahi at 1-2 positions with SRF on position 2
  let pairedRepairBonus = false
  if (repairShipFlagship && equips) {
    const secondShip = ships[_.get(fleet, 'api_ship.1', -1)]
    if (secondShip && _.includes(REPAIR_SHIP_ID, secondShip.api_ship_id)) {
      // Check if second position has SRF equipped
      const secondShipSRF = _.filter(
        secondShip.api_slot,
        (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
      ).length
      if (secondShipSRF > 0) {
        pairedRepairBonus = true
      }
    }
  }

  // Check for Nosaki in position 1 or 2
  // Timer starts when Nosaki is placed, eligibility checked at port return
  let nosakiPosition = -1
  let nosakiShipId = -1
  let nosakiPresent = false // Nosaki is in position 1 or 2
  let canBoostMorale = false // Nosaki is eligible to boost morale

  const checkNosakiAtPosition = (position: number) => {
    const ship = ships[_.get(fleet, `api_ship.${position}`, -1)]
    if (ship && _.includes(NOSAKI_ID_LIST, ship.api_ship_id)) {
      const constShip = $ships[ship.api_ship_id]
      if (!constShip) {
        return false
      }
      
      // Mark Nosaki as present (for timer management)
      nosakiPosition = position
      nosakiShipId = ship.api_ship_id
      nosakiPresent = true
      
      // Check eligibility conditions (for morale boost application)
      const isFullySupplied =
        ship.api_fuel === (constShip.api_fuel_max || 0) &&
        ship.api_bull === (constShip.api_bull_max || 0)
      // Wiki: "無傷～小破未満" means undamaged to below minor damage (HP > 75%, not > 50%)
      const isHealthy = ship.api_nowhp > ship.api_maxhp * 0.75
      const hasGoodMorale = ship.api_cond >= 30
      const notInRepair = !_.includes(repairId, ship.api_id)

      if (
        isFullySupplied &&
        isHealthy &&
        hasGoodMorale &&
        !inExpedition &&
        notInRepair
      ) {
        canBoostMorale = true
      }
      return true
    }
    return false
  }

  // Check flagship first, then second position
  if (!checkNosakiAtPosition(0)) {
    checkNosakiAtPosition(1)
  }

  return {
    canRepair,
    akashiFlagship,
    inExpedition,
    flagShipInRepair,
    canBoostMorale,
    nosakiPresent,
    nosakiPosition,
    nosakiShipId,
    repairShipFlagship,
    pairedRepairBonus,
  }
}

export const getFleetRepairCount = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  equips: Record<number, APIGetMemberSlotItemResponse>,
): number => {
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]
  if (!flagship) return 0

  // Check if flagship is a repair ship and determine base count
  const isRepairShip = _.includes(REPAIR_SHIP_ID, flagship.api_ship_id)
  if (!isRepairShip) return 0
  
  // Base repair count: Akashi/Akashi Kai = 2, Asahi Kai = 0
  const baseCount = _.includes(AKASHI_ID, flagship.api_ship_id) ? 2 : 0
  
  // Count SRF on flagship
  const flagshipSrfCount = _.filter(
    flagship.api_slot,
    (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
  ).length
  
  let totalSrfCount = flagshipSrfCount
  
  // Check for paired repair: if second position also has repair ship, add its SRF count
  const secondShip = ships[_.get(fleet, 'api_ship.1', -1)]
  if (secondShip && _.includes(REPAIR_SHIP_ID, secondShip.api_ship_id)) {
    const secondShipSrfCount = _.filter(
      secondShip.api_slot,
      (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
    ).length
    totalSrfCount += secondShipSrfCount
  }

  return baseCount + totalSrfCount
}

export const getFleetRepairDetail = (
  fleet: APIDeckPort,
  $ships: Record<number, APIMstShip>,
  ships: Record<number, APIShip>,
  repairId: number[],
  repairCount: number,
  nosakiShipId: number = -1,
  pairedRepairBonus: boolean = false,
): ShipRepairDetail[] => {
  const pickKey: (keyof APIShip)[] = [
    'api_id',
    'api_ship_id',
    'api_lv',
    'api_nowhp',
    'api_maxhp',
    'api_ndock_time',
    'api_cond',
    'api_fuel',
    'api_bull',
  ]

  return _.map(
    _.filter(fleet.api_ship, (shipId) => shipId > 0),
    (shipId, index) => {
      const ship = _.pick(ships[shipId], pickKey)
      const constShip = _.pick($ships[ship.api_ship_id], [
        'api_name',
        'api_stype',
      ])

      // Calculate morale boost potential
      // Exclude Nosaki herself from receiving morale boost (wiki requirement)
      const isNosaki = NOSAKI_ID_LIST.includes(ship.api_ship_id)
      const moraleEstimate = isNosaki 
        ? { canBoost: false, boostAmount: 0 }
        : nosakiMoraleEstimate({
            api_cond: ship.api_cond,
            nosakiShipId,
          })

      // Calculate base timePerHP
      let timePerHP = getTimePerHP(ship.api_lv, constShip.api_stype)
      
      // Apply paired repair bonus (15% faster repair speed)
      if (pairedRepairBonus && timePerHP > 0) {
        timePerHP = timePerHP * PAIRED_REPAIR_TIME_MULTIPLIER
      }

      return {
        ...ship,
        ...constShip,
        estimate: akashiEstimate(ship),
        timePerHP,
        inRepair: _.includes(repairId, ship.api_id),
        availableSRF: index < repairCount,
        canBoostMorale: moraleEstimate.canBoost && !_.includes(repairId, ship.api_id),
        moraleBoostAmount: moraleEstimate.boostAmount,
      }
    },
  )
}

export const canFleetRepair = (
  fleet: APIDeckPort,
  ships: Record<number, APIShip>,
  $ships: Record<number, APIMstShip>,
  repairId: number[],
  equips?: Record<number, APIGetMemberSlotItemResponse>,
): boolean => {
  const status = getFleetStatus(fleet, ships, $ships, repairId, equips)
  return status.canRepair
}
