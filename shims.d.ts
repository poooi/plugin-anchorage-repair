declare module 'views/utils/selectors' {
  import { Selector, createSelectorCreator } from 'reselect'
  import { APIShip } from 'kcsapi/api_port/port/response'
  import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
  import { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
  import { APIDeckPort } from 'kcsapi/api_port/port/response'

  export const fleetsSelector: Selector<any, APIDeckPort[]>
  export const shipsSelector: Selector<any, Record<number, APIShip>>
  export const equipsSelector: Selector<
    any,
    Record<number, APIGetMemberSlotItemResponse>
  >
  export const repairsSelector: Selector<any, APIGetMemberNdockResponse[]>
  export const miscSelector: Selector<any, { canNotify: boolean }>
  export const createDeepCompareArraySelector: typeof createSelectorCreator<
    any,
    any[]
  >
  export const fleetShipsIdSelectorFactory: (
    fleetId: number,
  ) => Selector<any, number[]>
}
