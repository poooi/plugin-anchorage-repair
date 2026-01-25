import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import styled from 'styled-components'
import { Tabs, Tab } from '@blueprintjs/core'
import _ from 'lodash'
import { useTranslation } from 'react-i18next'

declare global {
  interface Window {
    getStore: <T = unknown>(key: string) => T
  }
}

import FleetList from './fleet-list'
import { RepairQueue } from './candidates'
import { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import {
  fleetIdsSelector,
  createFleetCanRepairSelector,
} from './fleet-selectors'
import { akashiEstimate, AKASHI_INTERVAL } from './functions'
import { checkRepairActive, REPAIR_SHIP_ID } from './fleet-utils'
import { timerState } from './timer-state'
import type { APIReqHenseiChangeRequest } from 'kcsapi/api_req_hensei/change/request'
import type { APIReqMissionStartRequest } from 'kcsapi/api_req_mission/start/request'
import type { APIReqNyukyoStartRequest } from 'kcsapi/api_req_nyukyo/start/request'

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

const PluginAnchorageRepair: React.FC = () => {
  const fleetIds = useSelector(fleetIdsSelector)
  const [activeTab, setActiveTab] = useState<string | number>(1)

  const { t } = useTranslation('poi-plugin-anchorage-repair')

  // Global repair timer event handler - always active regardless of which tab is shown
  const handleGlobalRepairTimerEvents = useCallback((e: Event) => {
    const event = e as GameResponseEvent
    const { path, postBody } = event.detail

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

    const currentTime = Date.now()
    const lastRefresh = timerState.getLastRepairRefresh()
    const timeElapsed = lastRefresh > 0 ? (currentTime - lastRefresh) / 1000 : 0

    switch (path) {
      case '/kcsapi/api_port/port': {
        // Check if ANY fleet has repairs actually active (not just repair ship present)
        // WIKI: Timer should only run when repairs are functional (not in dock, expedition, HP >= 50%, etc.)
        const anyFleetRepairsActive = fleets.some((fleet) => {
          const { active } = checkRepairActive(fleet, ships, repairId, equips)
          return active
        })
        
        if (anyFleetRepairsActive && (timeElapsed >= AKASHI_INTERVAL / 1000 || lastRefresh === 0)) {
          timerState.setLastRepairRefresh(currentTime)
        }
        break
      }

      case '/kcsapi/api_req_hensei/change': {
        const body = postBody as APIReqHenseiChangeRequest
        const changedFleetId = parseInt(body.api_id, 10)
        
        if (!Number.isNaN(changedFleetId)) {
          const changedFleet = fleets.find((f) => f.api_id === changedFleetId)
          if (changedFleet) {
            const flagship = ships[_.get(changedFleet, 'api_ship.0', -1)]
            // WIKI: Reset only if "the fleet whose flagship is the repair ship gets a composition change"
            const repairShipFlagship = flagship && _.includes(REPAIR_SHIP_ID, flagship.api_ship_id)
            
            // Reset for both additions (shipId >= 0) and removals (shipId < 0) per WIKI
            // WIKI: "編成の変更によってカウントはリセットされる" (composition changes reset the count)
            if (repairShipFlagship) {
              if (timeElapsed < AKASHI_INTERVAL / 1000) {
                timerState.resetRepairTimer()
              } else {
                timerState.clearRepairTimer()
              }
            }
          }
        }
        break
      }

      case '/kcsapi/api_req_mission/start': {
        const body = postBody as APIReqMissionStartRequest
        const expedFleetId = parseInt(body.api_deck_id, 10)
        
        if (!Number.isNaN(expedFleetId)) {
          const expedFleet = fleets.find((f) => f.api_id === expedFleetId)
          if (expedFleet) {
            // WIKI: "工作艦を含む艦隊が遠征...カウントはリセット" (fleet containing repair ship goes on expedition)
            // Check if any ship in the expedition fleet is a repair ship
            const hasRepairShip = _.get(expedFleet, 'api_ship', []).some((shipId: number) => {
              const ship = ships[shipId]
              return ship && _.includes(REPAIR_SHIP_ID, ship.api_ship_id)
            })
            
            if (hasRepairShip) {
              timerState.resetRepairTimer()
            }
          }
        }
        break
      }

      case '/kcsapi/api_req_nyukyo/start': {
        const body = postBody as APIReqNyukyoStartRequest
        const shipId = parseInt(body.api_ship_id, 10)
        
        if (!Number.isNaN(shipId) && body.api_highspeed === '1') {
          // Check if ship belongs to a fleet with repair ship flagship
          const affectedFleet = fleets.find((fleet) =>
            _.includes(fleet.api_ship, shipId)
          )
          
          if (affectedFleet) {
            const flagship = ships[_.get(affectedFleet, 'api_ship.0', -1)]
            const repairShipFlagship = flagship && _.includes(REPAIR_SHIP_ID, flagship.api_ship_id)
            
            if (repairShipFlagship) {
              timerState.resetRepairTimer()
            }
          }
        }
        break
      }

      default:
        break
    }
  }, [])

  useEffect(() => {
    window.addEventListener('game.response', handleGlobalRepairTimerEvents)
    return () => {
      window.removeEventListener('game.response', handleGlobalRepairTimerEvents)
    }
  }, [handleGlobalRepairTimerEvents])

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
        equips?: Record<number, any>
      } = window.getStore('info') || {}
      const repairId = repairs.map((dock) => dock.api_ship_id)

      return fleets.some((fleet) => {
        // Use centralized helper to check repair activation
        const { active: canRepair } = checkRepairActive(fleet, ships, repairId, equips)

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
