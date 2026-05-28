import { Tabs, Tab } from '@blueprintjs/core'
import _ from 'lodash'
import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

declare global {
  interface Window {
    getStore: <T = unknown>(key: string) => T
  }
}

import type { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import type { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import type { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import type { APIReqHenseiChangeRequest } from 'kcsapi/api_req_hensei/change/request'
import type { APIReqMissionStartRequest } from 'kcsapi/api_req_mission/start/request'
import type { APIReqMissionResultRequest } from 'kcsapi/api_req_mission/result/request'
import type { APIReqNyukyoStartRequest } from 'kcsapi/api_req_nyukyo/start/request'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'

import { RepairQueue } from './candidates'
import FleetList from './fleet-list'
import {
  fleetIdsSelector,
  createFleetCanRepairSelector,
} from './fleet-selectors'
import {
  checkRepairActive,
  checkNosakiPresent,
  REPAIR_SHIP_ID,
  NOSAKI_ID_LIST,
  getFleetStatus,
} from './fleet-utils'
import { akashiEstimate, AKASHI_INTERVAL, NOSAKI_INTERVAL } from './functions'
import { timerState } from './timer-state'

const AnchorageRepairContainer = styled.div`
  padding: 1em;
  height: 100%;

  .bp5-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .bp5-tab-panel {
    height: 100%;
    overflow: auto;
  }

  .bp5-tab-list .bp5-tab.can-repair {
    flex: 2;
  }
`

const FleetTabPanel: React.FC<{ fleetId: number }> = ({ fleetId }) => {
  const canRepairSelector = React.useMemo(
    () => createFleetCanRepairSelector(fleetId),
    [fleetId],
  )
  const canRepair = useSelector(canRepairSelector)

  return (
    <div className={canRepair ? 'can-repair' : ''}>
      <FleetList fleetId={fleetId} />
    </div>
  )
}

type GameResponsePostBody =
  | APIReqHenseiChangeRequest
  | APIReqMissionStartRequest
  | APIReqNyukyoStartRequest
  | Record<string, string | number | undefined>

interface GameResponseEvent extends CustomEvent {
  detail: {
    path: string
    postBody: GameResponsePostBody
  }
}

type GameStateSnapshot = {
  fleets: APIDeckPort[]
  ships: Record<number, APIShip>
  repairs: APIGetMemberNdockResponse[]
  equips?: Record<number, APIGetMemberSlotItemResponse>
  $ships?: Record<number, APIMstShip>
  repairId: number[]
}

const PluginAnchorageRepair: React.FC = () => {
  const fleetIds = useSelector(fleetIdsSelector)
  const [activeTab, setActiveTab] = useState<string | number>(1)
  const previousRepairGameStateRef = React.useRef<GameStateSnapshot | null>(
    null,
  )

  const { t } = useTranslation('poi-plugin-anchorage-repair')

  // Helper to get common game state data
  const getGameState = () => {
    const {
      fleets = [],
      ships = {},
      repairs = [],
      equips,
      $ships = {},
    }: {
      fleets: APIDeckPort[]
      ships: Record<number, APIShip>
      repairs: APIGetMemberNdockResponse[]
      equips?: Record<number, APIGetMemberSlotItemResponse>
      $ships?: Record<number, APIMstShip>
    } = window.getStore('info') || {}
    const repairId = repairs.map((dock) => dock.api_ship_id)
    return { fleets, ships, repairs, equips, $ships, repairId }
  }

  // Handler for anchorage repair timer (Akashi/Asahi)
  const handleRepairTimerEvents = useCallback((e: Event) => {
    console.log(e)
    const event = e as GameResponseEvent
    const { path, postBody } = event.detail
    const { fleets, ships } =
      previousRepairGameStateRef.current ?? getGameState()

    const currentTime = Date.now()
    const lastRepairRefresh = timerState.getLastRepairRefresh()
    const repairTimeElapsed =
      lastRepairRefresh > 0 ? currentTime - lastRepairRefresh : 0

    switch (path) {
      case '/kcsapi/api_port/port': {
        // On port event: always start/reset timer (if 15min elapsed)
        if (lastRepairRefresh === 0) {
          // Timer not started yet - start it now
          timerState.setLastRepairRefresh(currentTime)
        } else if (repairTimeElapsed >= AKASHI_INTERVAL) {
          // More than 20min since last refresh, reset timer
          timerState.resetRepairTimer()
        }
        break
      }

      case '/kcsapi/api_req_hensei/preset_select':
        // Fleet preset loading doesn't reset timer (wiki requirement)
        break

      case '/kcsapi/api_req_hensei/change': {
        const body = postBody as APIReqHenseiChangeRequest
        const changedShipId = parseInt(body.api_ship_id, 10)
        const changedFleetId = parseInt(body.api_id, 10)

        // 舰队一括解除不会导致计时器重置
        if (changedShipId == -2) break

        // 在两个舰队交换舰娘的情况下，另一个舰队也需要检查是否有明石/朝日在位
        const changedFleetId2 = fleets.find((fleet) =>
          fleet.api_ship.some((id) => id === changedShipId),
        )?.api_id

        const fleetIdsToCheck = [changedFleetId, changedFleetId2].filter(
          (id) => id != null && !Number.isNaN(id),
        )
        for (const fleetId of fleetIdsToCheck) {
          const changedFleet = fleets.find((f) => f.api_id === fleetId)
          if (changedFleet) {
            const hasRepairShipFlagship = [0].some((idx) => {
              const shipId = changedFleet.api_ship[idx]
              return (
                shipId > 0 &&
                REPAIR_SHIP_ID.includes(ships[shipId]?.api_ship_id)
              )
            })
            if (hasRepairShipFlagship) {
              timerState.resetRepairTimer()
              break
            }
          }
        }
        break
      }

      case '/kcsapi/api_req_kaisou/remodeling':
        // Ship remodeling doesn't reset timer
        break

      case '/kcsapi/api_req_mission/result':
        // 经测试，远征归来不重置
        // 经测试，远征归来的舰队无法获得效果
        // No reset when fleet returns from expedition in test
        // No effect for fleets returning from expedition in test
        break

      default:
        break
    }
  }, [])

  // Handler for Nosaki morale timer (auto morale gain)
  const handleNosakiTimerEvents = useCallback((e: Event) => {
    const event = e as GameResponseEvent
    const { path, postBody } = event.detail
    const { fleets, ships } =
      previousRepairGameStateRef.current ?? getGameState()

    const currentTime = Date.now()
    const lastNosakiRefresh = timerState.getLastNosakiRefresh()
    const nosakiTimeElapsed =
      lastNosakiRefresh > 0 ? currentTime - lastNosakiRefresh : 0

    switch (path) {
      case '/kcsapi/api_port/port': {
        // On port event: always start/reset timer (if 15min elapsed)
        if (lastNosakiRefresh === 0) {
          // Timer not started yet - start it now
          timerState.setLastNosakiRefresh(currentTime)
        } else if (nosakiTimeElapsed >= NOSAKI_INTERVAL) {
          // More than 15min since last refresh, reset timer
          timerState.resetNosakiTimer()
        }
        break
      }

      case '/kcsapi/api_req_hensei/preset_select':
        // Fleet preset loading doesn't reset Nosaki timer (wiki requirement)
        break

      case '/kcsapi/api_req_hensei/change': {
        const body = postBody as APIReqHenseiChangeRequest
        const changedShipId = parseInt(body.api_ship_id, 10)
        const changedFleetId = parseInt(body.api_id, 10)

        // 舰队一括解除不会导致计时器重置
        // Fleet-wide disband doesn't reset timer
        if (changedShipId == -2) break

        // 在两个舰队交换舰娘的情况下，另一个舰队也需要检查是否有野崎在位
        const changedFleetId2 = fleets.find((fleet) =>
          fleet.api_ship.some((id) => id === changedShipId),
        )?.api_id

        const fleetIdsToCheck = [changedFleetId, changedFleetId2].filter(
          (id) => id != null && !Number.isNaN(id),
        )
        for (const fleetId of fleetIdsToCheck) {
          const changedFleet = fleets.find((f) => f.api_id === fleetId)
          if (changedFleet) {
            const hasNosakiIn12 = [0, 1].some((idx) => {
              const shipId = changedFleet.api_ship[idx]
              return (
                shipId > 0 &&
                NOSAKI_ID_LIST.includes(ships[shipId]?.api_ship_id)
              )
            })
            if (hasNosakiIn12) {
              timerState.resetNosakiTimer()
              break
            }
          }
        }
        break
      }

      case '/kcsapi/api_req_kaisou/remodeling':
        // Ship remodeling doesn't reset timer
        break

      case '/kcsapi/api_req_mission/result':
        // 经测试，远征归来不重置
        // 经测试，远征归来的舰队无法获得效果
        // No reset when fleet returns from expedition in test
        // No effect for fleets returning from expedition in test
        break

      default:
        break
    }
  }, [])

  const handleGameResponseEvents = useCallback(
    (e: Event) => {
      handleRepairTimerEvents(e)
      handleNosakiTimerEvents(e)
      // getGameState() 获取数据时变更已经发生，保存事件发生前的游戏状态以供计时器处理函数使用
      previousRepairGameStateRef.current = getGameState()
    },
    [handleRepairTimerEvents, handleNosakiTimerEvents],
  )

  useEffect(() => {
    window.addEventListener('game.response', handleGameResponseEvents)
    return () => {
      window.removeEventListener('game.response', handleGameResponseEvents)
    }
  }, [handleGameResponseEvents])

  return (
    <AnchorageRepairContainer id="anchorage-repair">
      <div style={{ height: '100%' }}>
        <Tabs
          selectedTabId={activeTab}
          onChange={(tabId) => setActiveTab(tabId)}
          id="anchorage-tabs"
          animate={false}
        >
          {_.map(fleetIds, (fleetId) => (
            <Tab
              key={`fleet-tab-${fleetId}`}
              id={fleetId}
              title={String(fleetId)}
              panel={<FleetTabPanel fleetId={fleetId} />}
            />
          ))}
          <Tab id={-1} title={t('Repair Queue')} panel={<RepairQueue />} />
        </Tabs>
      </div>
    </AnchorageRepairContainer>
  )
}

export const reactClass = PluginAnchorageRepair

/*

   The following APIs are called in order when a fleet returns from expedition:

   - api_req_mission/result
   - api_port/port

   As anchorage repair pops up conditionally on the latter one,
   it also prevents other plugins' auto-switch mechanism on
   tracking api_req_mission/result calls.

   The problem is solved by applying a lock upon expedition returns
   and ignoring the immediately followed api_port/port call.

 */
let expedReturnLock: ReturnType<typeof setTimeout> | null = null
const clearExpedReturnLock = () => {
  if (expedReturnLock !== null) {
    clearTimeout(expedReturnLock)
    expedReturnLock = null
  }
}

export const switchPluginPath = [
  {
    path: '/kcsapi/api_port/port',
    valid: () => {
      if (expedReturnLock !== null) {
        /*
           this is the immediately followed api_port/port call
           after an expedition returning event.
         */
        clearExpedReturnLock()
        return false
      }

      const {
        fleets = [],
        ships = {},
        repairs = [],
        equips,
      }: {
        fleets: APIDeckPort[]
        ships: Record<number, APIShip>
        repairs: APIGetMemberNdockResponse[]
        equips?: Record<number, APIGetMemberSlotItemResponse>
      } = window.getStore('info') || {}
      const repairId = repairs.map((dock) => dock.api_ship_id)

      return fleets.some((fleet) => {
        // Use centralized helper to check repair activation
        const { active: canRepair } = checkRepairActive(
          fleet,
          ships,
          repairId,
          equips,
        )

        if (!canRepair) return false

        // Check if any ship in fleet needs repair
        return _.filter(fleet.api_ship, (shipId) => shipId > 0)
          .map((shipId) => ships[shipId])
          .some((ship: APIShip) => ship && akashiEstimate(ship) > 0)
      })
    },
  },
  {
    path: '/kcsapi/api_req_mission/result',
    valid: () => {
      clearExpedReturnLock()
      expedReturnLock = setTimeout(
        clearExpedReturnLock,
        /*
           allow a window of 5 secnds before the lock
           clears itself
         */
        5000,
      )
      return false
    },
  },
]
