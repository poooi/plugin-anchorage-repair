import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createSelector } from 'reselect'
import _ from 'lodash'
import { join } from 'path'
import { Tabs, Tab } from 'react-bootstrap'

// Import selectors defined in poi
import {
  fleetsSelector,
  shipsSelector,
  equipsSelector,
  repairsSelector,
  miscSelector,
  createDeepCompareArraySelector,
} from 'views/utils/selectors'

import {
  akashiEstimate,
  getTimePerHP,
} from './parts/functions'
import FleetList from './parts/fleet-list'

const { i18n, getStore } = window
const __ = i18n['poi-plugin-anchorage-repair'].__.bind(i18n['poi-plugin-anchorage-repair'])

const AKASHI_ID = [182, 187] // akashi and kai ID in $ships
const SRF_ID = 86 // Ship Repair Facility ID in $slotitems


// check a fleet status, returns information related to anchorage repair
const fleetAkashiConv = (fleet, $ships, ships, equips, repairId) => {
  const pickKey = ['api_id', 'api_ship_id', 'api_lv', 'api_nowhp', 'api_maxhp', 'api_ndock_time']

  let canRepair = false
  let akashiFlagship = false
  let repairCount = 0
  const inExpedition = _.get(fleet, 'api_mission.0') && true
  const flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  const flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
    repairCount = _.filter(flagship.api_slot, item => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID).length
    repairCount += akashiFlagship ? 2 : 0
  }

  canRepair = akashiFlagship && !inExpedition && !flagShipInRepair

  const repairDetail = []
  _.forEach(fleet.api_ship, (shipId, index) => {
    if (shipId === -1) return false // break, LODASH ONLY

    const ship = _.pick(ships[shipId], pickKey)

    const constShip = _.pick($ships[ship.api_ship_id], ['api_name', 'api_stype'])

    repairDetail.push({
      ...ship,
      ...constShip,
      estimate: akashiEstimate(ship),
      timePerHP: getTimePerHP(ship.api_lv, constShip.api_stype),
      inRepair: _.includes(repairId, ship.api_id),
      availableSRF: index < repairCount,
    })
  })

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

const repairIdSelector = createSelector(
  [repairsSelector],
  repair => _.map(repair, dock => dock.api_ship_id)
)

const constShipsSelector = state => state.const.$ships || {}

const fleetsAkashiSelector = createSelector(
  [
    constShipsSelector,
    fleetsSelector,
    shipsSelector,
    equipsSelector,
    repairIdSelector,
  ],
  ($ships, fleets, ships, equips, repairId) =>
    ({ fleets: _.map(fleets, fleet => fleetAkashiConv(fleet, $ships, ships, equips, repairId)) })

)


// React

export const reactClass = connect(
  createDeepCompareArraySelector([
    fleetsAkashiSelector,
    miscSelector,
  ], (data, { canNotify }) => ({
    ...data,
    canNotify,
  }))
)(class PluginAnchorageRepair extends Component {

  constructor(props) {
    super(props)

    this.state = {
      activeTab: 1,
    }
  }

  handleSelectTab = (key) => {
    this.setState({ activeTab: key })
  }

  render() {
    return (
      <div id="anchorage-repair">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'style.css')} />
        <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelectTab} id="anchorage-tab">
          {
            _.map(this.props.fleets, (fleet, index) => {
              return (
                <Tab
                  eventKey={fleet.api_id}
                  title={fleet.api_id}
                  key={`anchorage-tab-${index}`}
                  tabClassName={fleet.canRepair ? 'can-repair' : ''}
                >
                  <FleetList fleet={fleet} />
                </Tab>
              )
            })
          }
        </Tabs>
      </div>
    )
  }
})

export const switchPluginPath = [
  {
    path: '/kcsapi/api_port/port',
    valid: () => {
      const { fleets = [], ships = {}, equips = {}, repairs = [] } = getStore('info') || {}
      const $ships = getStore('const.$ships')
      const repairId = repairs.map(dock => dock.api_ship_id)

      const result = fleets.map(fleet => fleetAkashiConv(fleet, $ships, ships, equips, repairId))
      return result.some(fleet =>
        fleet.canRepair && fleet.repairDetail.some(ship => ship.estimate > 0))
    },
  },
]
