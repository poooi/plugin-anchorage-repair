import { createSelector } from 'reselect'
import _ from 'lodash'
import {
  fleetsSelector,
  shipsSelector,
  equipsSelector,
  repairsSelector,
} from 'views/utils/selectors'
import { RootState } from '../poi-types'
import { APIDeckPort } from 'kcsapi/api_port/port/response'
import {
  getFleetBasicInfo,
  getFleetStatus,
  getFleetRepairCount,
  getFleetRepairDetail,
  canFleetRepair,
} from './fleet-utils'

const constShipsSelector = (state: RootState) => state.const.$ships || {}

const repairIdSelector = createSelector([repairsSelector], (repair) =>
  _.map(repair, (dock) => dock.api_ship_id),
)

const getFleetById = (fleets: APIDeckPort[], fleetId: number) =>
  fleets.find((f) => f.api_id === fleetId)

export const createFleetBasicInfoSelector = (fleetId: number) =>
  createSelector([fleetsSelector], (fleets) => {
    const fleet = getFleetById(fleets, fleetId)
    return fleet ? getFleetBasicInfo(fleet) : null
  })

export const createFleetStatusSelector = (fleetId: number) =>
  createSelector(
    [
      fleetsSelector,
      shipsSelector,
      constShipsSelector,
      repairIdSelector,
      equipsSelector,
    ],
    (fleets, ships, $ships, repairId, equips) => {
      const fleet = getFleetById(fleets, fleetId)
      return fleet
        ? getFleetStatus(fleet, ships, $ships, repairId, equips)
        : null
    },
  )

export const createFleetRepairCountSelector = (fleetId: number) =>
  createSelector(
    [fleetsSelector, shipsSelector, equipsSelector, repairIdSelector],
    (fleets, ships, equips, repairId) => {
      const fleet = getFleetById(fleets, fleetId)
      return fleet ? getFleetRepairCount(fleet, ships, equips, repairId) : 0
    },
  )

export const createFleetRepairDetailSelector = (fleetId: number) =>
  createSelector(
    [
      fleetsSelector,
      constShipsSelector,
      shipsSelector,
      repairIdSelector,
      createFleetRepairCountSelector(fleetId),
      createFleetStatusSelector(fleetId),
    ],
    (fleets, $ships, ships, repairId, repairCount, status) => {
      const fleet = getFleetById(fleets, fleetId)
      if (!fleet) return []
      const nosakiShipId = status?.nosakiShipId || -1
      const pairedRepairBonus = status?.pairedRepairBonus || false
      return getFleetRepairDetail(
        fleet,
        $ships,
        ships,
        repairId,
        repairCount,
        nosakiShipId,
        pairedRepairBonus,
      )
    },
  )

export const createFleetCanRepairSelector = (fleetId: number) =>
  createSelector(
    [
      fleetsSelector,
      shipsSelector,
      constShipsSelector,
      repairIdSelector,
      equipsSelector,
    ],
    (fleets, ships, $ships, repairId, equips) => {
      const fleet = getFleetById(fleets, fleetId)
      if (!fleet) return false
      return canFleetRepair(fleet, ships, $ships, repairId, equips)
    },
  )

export const fleetIdsSelector = createSelector([fleetsSelector], (fleets) =>
  fleets.map((fleet) => fleet.api_id || -1),
)
