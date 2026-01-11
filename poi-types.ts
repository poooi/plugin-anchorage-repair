import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { APIDeckPort } from 'kcsapi/api_port/port/response'
import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'

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
