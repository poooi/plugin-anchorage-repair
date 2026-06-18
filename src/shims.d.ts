declare module 'views/utils/selectors' {
  import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
  import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
  import type { APIShip } from 'kcsapi/api_port/port/response'
  import type { APIDeckPort } from 'kcsapi/api_port/port/response'
  import type { Selector, createSelector } from 'reselect'

  import type { RootState } from '../poi-types'

  export const fleetsSelector: Selector<RootState, APIDeckPort[]>
  export const shipsSelector: Selector<RootState, Record<number, APIShip>>
  export const equipsSelector: Selector<
    RootState,
    Record<number, APIGetMemberSlotItemResponse>
  >
  export const repairsSelector: Selector<RootState, APIGetMemberNdockResponse[]>
  export const miscSelector: Selector<RootState, { canNotify: boolean }>
  export const createDeepCompareArraySelector: typeof createSelector
  export const fleetShipsIdSelectorFactory: (
    fleetId: number,
  ) => Selector<RootState, number[]>
}

declare module 'views/components/main/parts/countdown-timer' {
  import type { ComponentType } from 'react'
  export const CountdownTimerInner: ComponentType<{
    countdownId: string
    startTime?: number
    tickCallback?: (timeElapsed: number) => void
    startCallback?: () => void
  }>

  export const CountdownNotifierLabel: ComponentType<{
    timerKey: string
    completeTime: number
    getLabelStyle: (_: unknown, timeRemaining: number) => string
    getNotifyOptions: () =>
      | {
          type: string
          title: string
          message: string
          icon: string
          preemptTime: number
          groupKey: string
        }
      | undefined
  }>
}

declare module 'views/utils/tools' {
  export const resolveTime: (timeElapsed: number) => string
}

declare module 'views/components/etc/overlay' {
  export { Tooltip, Popover, Dialog } from '@blueprintjs/core'
}

declare module '@storybook/react-vite' {
  import type { ComponentType, ReactElement } from 'react'

  export type Decorator = (Story: ComponentType) => ReactElement

  export type Meta<TComponent = unknown> = {
    title?: string
    component?: TComponent
    args?: Record<string, unknown>
    parameters?: Record<string, unknown>
  }

  export type Preview = {
    decorators?: Decorator[]
    parameters?: Record<string, unknown>
  }

  export type StoryObj<TMeta = unknown> = {
    name?: string
    args?: Record<string, unknown>
    decorators?: Decorator[]
    parameters?: Record<string, unknown>
    readonly __meta?: TMeta
  }
}
