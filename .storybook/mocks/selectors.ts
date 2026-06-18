import type { RootState } from '../../poi-types'

export const equipsSelector = (state: RootState) => state.info.equips

export const fleetsSelector = (state: RootState) => state.info.fleets

export const fleetShipsIdSelectorFactory =
  (fleetId: number) => (state: RootState) =>
    state.info.fleets[fleetId]?.api_ship || []

export const repairsSelector = (state: RootState) => state.info.repairs

export const shipsSelector = (state: RootState) => state.info.ships
