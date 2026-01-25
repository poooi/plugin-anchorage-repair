import type { RootState } from '../../../poi-types'
import type { Selector } from 'reselect'
import type { APIShip, APIDeckPort } from 'kcsapi/api_port/port/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'

/**
 * Mock selectors for poi's views/utils/selectors module.
 * These selectors extract state from the Redux store for testing.
 */

/** Returns array of fleet objects from state */
export const fleetsSelector: Selector<RootState, APIDeckPort[]> = (state) =>
  state.info.fleets || []

/** Returns record of ship objects keyed by ship api_id */
export const shipsSelector: Selector<RootState, Record<number, APIShip>> = (state) =>
  state.info.ships || {}

/** Returns record of equipment objects keyed by equipment id */
export const equipsSelector: Selector<RootState, Record<number, APIGetMemberSlotItemResponse>> = (state) =>
  state.info.equips || {}

/** Returns array of repair dock objects */
export const repairsSelector: Selector<RootState, APIGetMemberNdockResponse[]> = (state) =>
  state.info.repairs || []

/** Returns misc state containing notification settings */
export const miscSelector: Selector<RootState, { canNotify: boolean }> = (state) =>
  state.misc

/**
 * Factory function that creates a selector for ship IDs in a specific fleet.
 *
 * @param fleetId - 0-indexed fleet ID (0-3 for fleets 1-4)
 * @returns Selector that returns array of valid ship IDs (> 0) in the fleet
 *
 * The real poi selector uses a 0-indexed fleetId, where:
 * - fleetId 0 = Fleet 1
 * - fleetId 1 = Fleet 2
 * - fleetId 2 = Fleet 3
 * - fleetId 3 = Fleet 4
 */
export const fleetShipsIdSelectorFactory = (fleetId: number): Selector<RootState, number[]> =>
  (state: RootState) => {
    const fleets = state.info.fleets || []
    const fleet = fleets[fleetId]
    if (!fleet) return []
    return (fleet.api_ship || []).filter((id: number) => id > 0)
  }
