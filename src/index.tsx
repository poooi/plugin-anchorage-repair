import React, { useState } from 'react'
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
import {
  fleetIdsSelector,
  createFleetCanRepairSelector,
} from './fleet-selectors'
import { akashiEstimate, MODERATE_PERCENT } from './functions'
import { AKASHI_ID, REPAIR_SHIP_ID, ASAHI_KAI_ID, SRF_ID } from './fleet-utils'

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

const PluginAnchorageRepair: React.FC = () => {
  const fleetIds = useSelector(fleetIdsSelector)
  const [activeTab, setActiveTab] = useState<string | number>(1)

  const { t } = useTranslation('poi-plugin-anchorage-repair')

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
        equips = {},
      }: {
        fleets: APIDeckPort[]
        ships: Record<number, APIShip>
        repairs: APIGetMemberNdockResponse[]
        equips?: Record<number, any>
      } = window.getStore('info') || {}
      const repairId = repairs.map((dock) => dock.api_ship_id)

      return fleets.some((fleet) => {
        const inExpedition = Boolean(_.get(fleet, 'api_mission.0'))
        const flagShipInRepair = _.includes(
          repairId,
          _.get(fleet, 'api_ship.0', -1),
        )
        const flagship = ships[_.get(fleet, 'api_ship.0', -1)]
        
        if (!flagship) return false
        
        const repairShipFlagship = _.includes(REPAIR_SHIP_ID, flagship.api_ship_id)
        if (!repairShipFlagship) return false
        
        const flagshipHealthy = flagship.api_nowhp > flagship.api_maxhp * MODERATE_PERCENT
        
        // Check if Asahi Kai has at least 1 SRF
        let asahiKaiHasSRF = true
        if (flagship.api_ship_id === ASAHI_KAI_ID && equips) {
          const flagshipSrfCount = _.filter(
            flagship.api_slot,
            (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
          ).length
          asahiKaiHasSRF = flagshipSrfCount > 0
        } else if (flagship.api_ship_id === ASAHI_KAI_ID && !equips) {
          // Conservative: if Asahi Kai but no equips data, assume can't repair
          asahiKaiHasSRF = false
        }
        
        const canRepair = !inExpedition && !flagShipInRepair && flagshipHealthy && asahiKaiHasSRF

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
