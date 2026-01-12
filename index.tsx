import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { createSelector, Selector } from 'reselect'
import styled from 'styled-components'
import _ from 'lodash'
import { Tabs, Tab } from 'react-bootstrap'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { useTranslation } from 'react-i18next'

declare global {
  interface Window {
    getStore: <T = unknown>(key: string) => T
  }
}

// Import selectors defined in poi
import {
  fleetsSelector,
  shipsSelector,
  equipsSelector,
  repairsSelector,
  createDeepCompareArraySelector,
} from 'views/utils/selectors'

import { akashiEstimate, getTimePerHP } from './parts/functions'
import FleetList from './parts/fleet-list'
import Candidates from './parts/candidates'
import { APIDeckPort, APIShip } from 'kcsapi/api_port/port/response'
import { APIGetMemberSlotItemResponse } from 'kcsapi/api_get_member/slot_item/response'
import { APIGetMemberNdockResponse } from 'kcsapi/api_get_member/ndock/response'
import { RootState } from './poi-types'

const AKASHI_ID = [182, 187] // akashi and kai ID in $ships
const SRF_ID = 86 // Ship Repair Facility ID in $slotitems

type FleetAkashiConvReturn = {
  api_id: number
  shipId: number[]
  canRepair: boolean
  akashiFlagship: boolean
  inExpedition: boolean
  flagShipInRepair: boolean
  repairCount: number
  repairDetail: Array<{
    api_id: number
    api_ship_id: number
    api_lv: number
    api_nowhp: number
    api_maxhp: number
    api_ndock_time: number
    api_name: string
    api_stype: number
    estimate: number
    timePerHP: number
    inRepair: boolean
    availableSRF: boolean
  }>
}

// check a fleet status, returns information related to anchorage repair
const fleetAkashiConv = (
  fleet: APIDeckPort,
  $ships: Record<number, APIMstShip>,
  ships: Record<number, APIShip>,
  equips: Record<number, APIGetMemberSlotItemResponse>,
  repairId: number[],
): FleetAkashiConvReturn => {
  const pickKey: (keyof APIShip)[] = [
    'api_id',
    'api_ship_id',
    'api_lv',
    'api_nowhp',
    'api_maxhp',
    'api_ndock_time',
  ]

  let canRepair = false
  let akashiFlagship = false
  let repairCount = 0
  const inExpedition = Boolean(_.get(fleet, 'api_mission.0')) && true
  const flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
    repairCount = _.filter(
      flagship.api_slot,
      (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID,
    ).length
    repairCount += akashiFlagship ? 2 : 0
  }

  canRepair = akashiFlagship && !inExpedition && !flagShipInRepair

  const repairDetail = _.map(
    _.filter(fleet.api_ship, (shipId) => shipId > 0),
    (shipId, index) => {
      const ship = _.pick(ships[shipId], pickKey)

      const constShip = _.pick($ships[ship.api_ship_id], [
        'api_name',
        'api_stype',
      ])

      return {
        ...ship,
        ...constShip,
        estimate: akashiEstimate(ship),
        timePerHP: getTimePerHP(ship.api_lv, constShip.api_stype),
        inRepair: _.includes(repairId, ship.api_id),
        availableSRF: index < repairCount,
      }
    },
  )

  return {
    api_id: fleet.api_id || -1,
    shipId: fleet.api_ship || [],
    canRepair,
    akashiFlagship,
    inExpedition,
    flagShipInRepair,
    repairCount,
    repairDetail,
  }
}

// selectors

const repairIdSelector: Selector<RootState, number[]> = createSelector(
  [repairsSelector],
  (repair) => _.map(repair, (dock) => dock.api_ship_id),
)

const constShipsSelector: Selector<RootState, Record<number, APIMstShip>> = (
  state,
) => state.const.$ships || {}

const fleetsAkashiSelector = createSelector(
  [
    constShipsSelector,
    fleetsSelector,
    shipsSelector,
    equipsSelector,
    repairIdSelector,
  ],
  ($ships, fleets, ships, equips, repairId) => ({
    fleets: _.map(fleets, (fleet) =>
      fleetAkashiConv(fleet, $ships, ships, equips, repairId),
    ),
  }),
)

const fleetSelector: Selector<RootState, { fleets: FleetAkashiConvReturn[] }> =
  createDeepCompareArraySelector([fleetsAkashiSelector], (data) => data)

const AnchorageRepairContainer = styled.div`
  padding: 1em;
  height: 100%;

  #anchorage-tabs {
    height: 100%;
  }

  .tab-content {
    height: 100%;
  }

  .nav li.can-repair {
    flex: 2;
  }
`

const CandidatePaneTab = styled(Tab)`
  height: 100%;
`

const PluginAnchorageRepair: React.FC = () => {
  const { fleets } = useSelector(fleetSelector)
  const [activeTab, setActiveTab] = useState(1)
  const [sortIndex, setSortIndex] = useState(0)

  const { t } = useTranslation('poi-plugin-anchorage-repair')

  const handleSelectTab = (key: number) => {
    setActiveTab(key)
  }

  const handleSort = (index: number) => () => {
    setSortIndex(index)
  }

  return (
    <AnchorageRepairContainer id="anchorage-repair">
      <Tabs
        activeKey={activeTab}
        onSelect={handleSelectTab}
        id="anchorage-tabs"
      >
        {_.map(fleets, (fleet, index) => (
          <Tab
            eventKey={fleet.api_id}
            title={fleet.api_id}
            key={`anchorage-tab-${index}`}
            tabClassName={fleet.canRepair ? 'can-repair' : ''}
          >
            <FleetList fleet={fleet} />
          </Tab>
        ))}
        <CandidatePaneTab eventKey={-1} title={t('Candidates')}>
          <Candidates handleSort={handleSort} sortIndex={sortIndex} />
        </CandidatePaneTab>
      </Tabs>
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
let expedReturnLock: number | null = null
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
        equips = {},
        repairs = [],
      }: {
        fleets: APIDeckPort[]
        ships: Record<number, APIShip>
        equips: Record<number, APIGetMemberSlotItemResponse>
        repairs: APIGetMemberNdockResponse[]
      } = window.getStore('info') || {}
      const $ships: Record<number, APIMstShip> = window.getStore('const.$ships')
      const repairId = repairs.map((dock) => dock.api_ship_id)

      const result = fleets.map((fleet) =>
        fleetAkashiConv(fleet, $ships, ships, equips, repairId),
      )
      return result.some(
        (fleet) =>
          fleet.canRepair &&
          fleet.repairDetail.some((ship) => ship.estimate > 0),
      )
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
