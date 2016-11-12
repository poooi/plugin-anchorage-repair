import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createSelector  } from 'reselect'
import Inspector from 'react-inspector'
import _ from 'lodash'
import {join} from 'path'
import {Tabs, Tab} from 'react-bootstrap'


import {
  akashiEstimate,
  timePerHPCalc,
} from './parts/functions'
import { FleetList } from './parts/fleet-list'

// Import selectors defined in poi
import {
  fleetsSelector,
  shipsSelector,
  equipsSelector,
  repairsSelector,
  constSelector,
  miscSelector,
  createDeepCompareArraySelector,
} from 'views/utils/selectors'

const { i18n } = window
const __ = i18n["poi-plugin-anchorage-repair"].__.bind(i18n["poi-plugin-anchorage-repair"])

const AKASHI_ID = [182, 187] // akashi and kai ID in $ships
const SRF_ID = 86 // Ship Repair Facility ID in $slotitems


// check a fleet status, returns information related to anchorage repair
const fleetAkashiConv = (fleet, ships, equips, repairId) => {

  const pickKey = ['api_id', 'api_ship_id', 'api_lv', 'api_nowhp', 'api_maxhp', 'api_ndock_time']

  let canRepair = false
  let akashiFlagship =false
  let repairCount = 0
  let inExpedition = _.get(fleet,'api_mission.0') && true
  let flagShipInRepair = _.includes(repairId, _.get(fleet, 'api_ship.0', -1))
  let flagship = ships[_.get(fleet, 'api_ship.0', -1)]

  if (flagship != null) {
    akashiFlagship = _.includes(AKASHI_ID, flagship.api_ship_id)
    repairCount = _.filter(flagship.api_slot, (item) => _.get(equips, `${item}.api_slotitem_id`, -1) === SRF_ID).length
    repairCount = repairCount + (akashiFlagship ? 2 : 0)
  }

  canRepair = akashiFlagship && !inExpedition && !flagShipInRepair

  let repairDetail = []
  _.forEach(fleet.api_ship, (shipId, index) => {

    if (shipId == -1) return false // break, LODASH ONLY

    let ship = _.pick(ships[shipId], pickKey)

    repairDetail.push({
      ...ship,
      estimate: akashiEstimate(ship),
      timePerHP: timePerHPCalc(ship),
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
  (repair) => _.map(repair, (dock) => dock.api_ship_id)
)


const fleetsAkashiSelector = createSelector(
  [
    fleetsSelector,
    shipsSelector,
    equipsSelector,
    repairIdSelector,
  ],
  (fleets, ships, equips, repairId) => {
    return {fleets: _.map(fleets, fleet => fleetAkashiConv(fleet, ships, equips, repairId))}
  }
)



// React

export const reactClass = connect(
  createDeepCompareArraySelector([
    fleetsAkashiSelector,
    miscSelector,
  ], (data, {canNotify}) => ({
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

  componentWillReceiveProps(nextProps) {
    console.log(this.props, this.state)
  }


  handleSelectTab = (key) => {
    this.setState({activeTab: key})
  }

  render() {
    return (
      <div id="anchorage-repair">
        <link rel="stylesheet" href={join(__dirname, 'assets', 'style.css')} />
        <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelectTab} id="anchorage-tab">
          {
            _.map(this.props.fleets, (fleet, index) => {
              return(
                <Tab eventKey={fleet.api_id} title={fleet.api_id} key={`anchorage-tab-${index}`}>
                  <FleetList fleet={fleet} />
                </Tab>
              )
            })
          }
        </Tabs>
        <Inspector data={[this.props, this.state]} theme="chromeDark" />
      </div>
    )
  }
})
