import React, { Component } from 'react'
import { connect } from 'react-redux'
// import { createSelector  } from 'reselect'
import { Label} from 'react-bootstrap'
import { resolveTime } from 'views/utils/tools'
import { constSelector, createDeepCompareArraySelector } from 'views/utils/selectors'
import { CountdownNotifierLabel } from 'views/components/main/parts/countdown-timer.es'

import {
  repairEstimate,
  getHPLabelStyle,
  getCountdownLabelStyle,
} from './functions'

// const constShipsSelector = createSelector(
//   constSelector,
//   (_const) => _.keyBy(_const.$ships, 'api_id')
// )

const { i18n } = window
const __ = i18n["poi-plugin-anchorage-repair"].__.bind(i18n["poi-plugin-anchorage-repair"])

export const ShipRow = connect(
  createDeepCompareArraySelector(constSelector, ({$ships}) =>  ({
    $ships,
  }))
)(class ShipRowClass extends Component {
  render() {
    const {timeElapsed, lastRefresh, canRepair, ship, $ships} = this.props
    const {api_nowhp, api_maxhp, availableSRF, estimate, timePerHP, api_id, api_ship_id, api_lv} = ship
    let completeTime = lastRefresh + estimate
    return(
      <tr>
        <td>
          {$ships[api_ship_id].api_name}
          <span className="lv-label">Lv.{api_lv}</span>
        </td>
        <td>
          <Label bsStyle={getHPLabelStyle(api_nowhp, api_maxhp, availableSRF)}>
            {`${api_nowhp} / ${api_maxhp}`}
          </Label>
        </td>
        <td>
        { estimate > 0 && canRepair && availableSRF ?
          <CountdownNotifierLabel
            timerKey={`anchorage-ship-${api_id}`}
            completeTime={completeTime}
            getLabelStyle={getCountdownLabelStyle}
            getNotifyOptions={ () => (lastRefresh > 0) && {
              ...this.constructor.basicNotifyConfig,
              completeTime,
              args: $ships[api_ship_id].api_name,
            }}
          /> :
          ''
        }
        </td>
        <td>{timePerHP ? resolveTime(timePerHP / 1000) : '' }</td>
        <td>{canRepair && repairEstimate(ship, timeElapsed, availableSRF)}</td>
      </tr>
    )
  }
})