import React, { Component } from 'react'
import { connect } from 'react-redux'
import { createSelector  } from 'reselect'
import Inspector from 'react-inspector'
import _ from 'lodash'
import {join} from 'path'
import {Tabs, Tab, Table, Grid, Row, Col, OverlayTrigger, Tooltip, Label, Panel} from 'react-bootstrap'
import { resolveTime } from 'views/utils/tools'
import { CountupTimer } from './countup-timer'

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

import { CountdownNotifierLabel } from 'views/components/main/parts/countdown-timer.es'

// import i18n2 from 'i18n-2'
//
// const i18n = new i18n2({
//   // setup some locales - other locales default to the first locale
//   locales: ['ko-KR', 'en-US', 'ja-JP', 'zh-CN', 'zh-TW'],
//   devMode: true,
//   directory: join(__dirname, 'i18n'),
//   extension: '.json',
//   indent: '  ',
// })
//
// i18n.setLocale(window.language)
// let __ = i18n.__.bind(i18n)

const { ROOT, i18n } = window
const __ = i18n["poi-plugin-anchorage-repair"].__.bind(i18n["poi-plugin-anchorage-repair"])

const AKASHI_ID = [182, 187] // akashi and kai ID in $ships
const SRF_ID = 86 // Ship Repair Facility ID in $slotitems
const AKASHI_INTERVAL = 20 * 60 * 1000 // minimum time required, in ms
const DOCKING_OFFSET = 30 * 1000 // offset in docking time formula
const MINOR_PERCENT = 0.5 // minor damage determination


// estimate the time needed in anchorage repair
const akashiEstimate = ({api_nowhp, api_maxhp, api_ndock_time}) => {

  if (api_ndock_time === 0 || api_nowhp >= api_maxhp) return 0

  if (api_nowhp < api_maxhp * MINOR_PERCENT) return 0 // damage check

  return Math.max(api_ndock_time, AKASHI_INTERVAL)
}

const timePerHPCalc = ({api_nowhp, api_maxhp, api_ndock_time}) => {
  return (api_nowhp < api_maxhp && api_nowhp >= api_maxhp * MINOR_PERCENT) ?
    ((api_ndock_time - DOCKING_OFFSET) / (api_maxhp - api_nowhp)) :
    0
}

const repairEstimate = ({api_nowhp, api_maxhp, timePerHP}, timeElapsed = 0, availableSRF = false) => {
  // timeElapsed is in seconds
  if (api_nowhp >= api_maxhp || timePerHP == 0 || !availableSRF) return 0

  if (timeElapsed * 1000 < AKASHI_INTERVAL) {
    return 0
  }
  else {
    return Math.min(Math.max(Math.floor(timeElapsed * 1000 / timePerHP), 1), api_maxhp - api_nowhp)
  }
}

const getHPLabelStyle = (nowhp, maxhp, availableSRF = true) => {
  let percentage = nowhp / maxhp
  if (!availableSRF) return 'warning'
  switch(true){
  case (percentage == 1):
    return 'success'
  case (percentage >= MINOR_PERCENT):
    return 'primary'
  case (percentage < MINOR_PERCENT):
    return 'warning'
  }
}

const getCountdownLabelStyle = (props, timeRemaining) => {
  return (
    timeRemaining > 600 ? 'primary' :
    timeRemaining > 60 ? 'warning' :
    timeRemaining >= 0 ? 'success' :
    'default'
  )
}


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
    constSelector,
    miscSelector,
  ], (data, {$ships}, {canNotify}) => ({
    ...data,
    $ships,
    canNotify,
  }))
)(class PluginAnchorageRepair extends Component {

  constructor(props) {
    super(props)

    this.state = {
      lastRefresh: Array(4).fill(0),
      timeElapsed: Array(4).fill(0),
      activeTab: 1,
    }
  }

  static basicNotifyConfig = {
    type: 'repair',
    title: __('Anchorage repair'),
    message: (names) => `${_.joinString(names, ', ')} ${__('anchorage repair completed')}`,
    icon: join(ROOT, 'assets', 'img', 'operation', 'repair.png'),
    preemptTime: 60,
  }

  componentDidMount= () => {
    window.addEventListener('game.response', this.handleResponse)
  }

  componentWillUnmount = () => {
    window.removeEventListener('game.response', this.handleResponse)
  }

  resetRefresh = (fleetId, time = Date.now()) => {
    let _tmp
    if (_.includes([1, 2, 3, 4], fleetId)) {
      _tmp = this.state.lastRefresh.slice()
      _tmp[fleetId -1] = time
      this.setState({lastRefresh: _tmp})
    }
  }

  tick = (fleetId) => (timeElapsed) => {
    if (timeElapsed % 10 == 0 && _.includes([1, 2, 3, 4], fleetId)) { // limit component refresh rate
      let _tmp = this.state.timeElapsed.slice()
      _tmp[fleetId - 1] = timeElapsed
      this.setState({timeElapsed: _tmp})
    }
  }

  resetTimeElapsed = (fleetId) => () => {
    let _tmp = this.state.timeElapsed.slice()
    _tmp[fleetId - 1] = 0
    this.setState({timeElapsed: _tmp})
  }

  handleResponse = (e) => {
    const {path, body, postBody} = e.detail
    let fleetId, shipId, infleet
    switch (path) {
    case '/kcsapi/api_port/port':
      this.setState({
        lastRefresh: Array(4).fill(Date.now()),
        timeElapsed: Array(4).fill(0),
      })
      break
    case '/kcsapi/api_req_hensei/change':
      fleetId = parseInt(postBody.api_id)
      if (!Number.isNaN(fleetId)) this.resetRefresh(fleetId, 0)
      break
    case '/kcsapi/api_req_nyukyo/start':
      shipId = parseInt(postBody.api_ship_id)
      infleet = _.filter(this.props.fleets, fleet => _.includes(fleet.shipId, shipId))
      if (postBody.api_highspeed == 1 && infleet != null) {
        fleetId = infleet[0].api_id
        this.resetRefresh(fleetId)
      }
      break
    }
  }

  componentWillReceiveProps(nextProps) {
    console.log(this.props, this.state)
  }

  renderFleet = (fleet) => {
    let result = []
    let timeElapsed = this.state.timeElapsed[fleet.api_id - 1]
    let lastRefresh = this.state.lastRefresh[fleet.api_id - 1]

    _.forEach(fleet.repairDetail, (ship, index) => {
      let {api_nowhp, api_maxhp, availableSRF, estimate, timePerHP, api_id, api_lv} = ship
      let completeTime = lastRefresh + estimate
      // if (estimate) console.log(`fire!${Date.now()}-${estimate}`, `anchorage-ship-${api_id}`)
      result.push(
        <tr>
          <td>
            {window._ships[api_id].api_name}
            <span className="lv-label">Lv.{api_lv}</span>
          </td>
          <td>
            <Label bsStyle={getHPLabelStyle(api_nowhp, api_maxhp, availableSRF)}>
              {`${api_nowhp} / ${api_maxhp}`}
            </Label>
          </td>
          <td>
          { estimate > 0 && fleet.canRepair && availableSRF ?
            <CountdownNotifierLabel
              timerKey={`anchorage-ship-${api_id}`}
              completeTime={completeTime}
              getLabelStyle={getCountdownLabelStyle}
              getNotifyOptions={ () => (lastRefresh > 0) && {
                ...this.constructor.basicNotifyConfig,
                completeTime,
                args: window._ships[api_id].api_name,
              }}
            /> :
            ''
          }
          </td>
          <td>{timePerHP ? resolveTime(timePerHP / 1000) : '' }</td>
          <td>{fleet.canRepair && repairEstimate(ship, timeElapsed, availableSRF)}</td>
        </tr>
      )}
    )

    return(
      <Grid>
        <link rel="stylesheet" href={join(__dirname, 'assets', 'style.css')} />
        <Row className="info-row">
          <Col xs={4} className="info-col">
            <OverlayTrigger placement="bottom" trigger={fleet.canRepair ? 'manual' : ['hover','focus']} overlay={
              <Tooltip>
                <p>{fleet.akashiFlagship ? '' : __('Akashi not flagship')}</p>
                <p>{fleet.inExpedition ? __('fleet in expedition') : ''}</p>
                <p>{fleet.flagShipInRepair ? __('flagship in dock') : ''}</p>
              </Tooltip>
            }>
              <Label bsStyle={fleet.canRepair ? 'success' : 'warning'}>
                {fleet.canRepair ? __('Repairing') : __('Not ready')}
              </Label>
            </OverlayTrigger>
          </Col>
          <Col xs={4} className="info-col">
          { fleet.canRepair ?
              <Label bsStyle={this.state.lastRefresh[fleet.api_id - 1] ? 'success' : 'warning'}>
                <span>{__('Elapsed:')} </span>
                <CountupTimer
                  countdownId={`akashi-${fleet.api_id}`}
                  startTime={ this.state.lastRefresh[fleet.api_id - 1]}
                  tickCallback={this.tick(fleet.api_id)}
                  startCallback={this.resetTimeElapsed(fleet.api_id)}
                />
              </Label> :
              ''
          }
          </Col>
          <Col xs={4} className="info-col">
            <Label bsStyle={fleet.repairCount? 'success' : 'warning'}>{__('Capacity: %s', fleet.repairCount)}</Label>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Panel bsStyle="warning" className={lastRefresh == 0 ? '' : 'hidden'}>
              {__('Please return to HQ screen to make timer refreshed.')}
            </Panel>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Table bordered condensed>
              <thead>
                <tr>
                  <th>{__('Ship Name')}</th>
                  <th>{__('HP')}</th>
                  <th>{__('Akashi Time')}</th>
                  <th>{__('Per HP')}</th>
                  <th>{__('Estimated repaired')}</th>
                </tr>
              </thead>
              <tbody>
                {result}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Grid>
    )
  }

  handleSelectTab = (key) => {
    this.setState({activeTab: key})
  }

  render() {
    return (
      <div id="anchorage-repair">
          <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelectTab} id="anchorage-tab">
          {
            _.map(this.props.fleets, (fleet, index) => {
              return(
                <Tab eventKey={fleet.api_id} title={fleet.api_id}>
                  {this.renderFleet(fleet)}
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
