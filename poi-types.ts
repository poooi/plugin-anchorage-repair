import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIShip } from 'kcsapi/api_port/port/response'
import type { APIDeckPort } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'

export type RootState = {
  const: {
    $ships: Record<number, APIMstShip>
  }
  info: {
    ships: Record<number, APIShip>
    fleets: APIDeckPort[]
    equips: Record<number, APIGetMemberSlotItemResponse>
    repairs: APIGetMemberNdockResponse[]
  }
  misc: {
    canNotify: boolean
  }
}
