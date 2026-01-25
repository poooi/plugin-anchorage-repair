import type { RootState } from '../../../poi-types'
import type { Selector } from 'reselect'
import type { APIShip, APIDeckPort } from 'kcsapi/api_port/port/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'

export const fleetsSelector: Selector<RootState, APIDeckPort[]> = (state) =>
  state.info.fleets || []

export const shipsSelector: Selector<RootState, Record<number, APIShip>> = (state) =>
  state.info.ships || {}

export const equipsSelector: Selector<RootState, Record<number, APIGetMemberSlotItemResponse>> = (state) =>
  state.info.equips || {}

export const repairsSelector: Selector<RootState, APIGetMemberNdockResponse[]> = (state) =>
  state.info.repairs || []

export const miscSelector: Selector<RootState, { canNotify: boolean }> = (state) =>
  state.misc

export const fleetShipsIdSelectorFactory = (fleetId: number): Selector<RootState, number[]> =>
  (state: RootState) => {
    const fleets = state.info.fleets || []
    // fleetShipsIdSelectorFactory uses 0-indexed fleetId
    const fleet = fleets[fleetId]
    if (!fleet) return []
    return (fleet.api_ship || []).filter((id: number) => id > 0)
  }
