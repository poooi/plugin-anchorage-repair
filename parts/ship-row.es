import React, { Component } from 'react'
import { connect } from 'react-redux'
// import { createSelector  } from 'reselect'
import _ from 'lodash'
import { join } from 'path'
import { Label} from 'react-bootstrap'
import { resolveTime } from 'views/utils/tools'
import { constSelector, createDeepCompareArraySelector } from 'views/utils/selectors'
import { CountdownNotifierLabel } from 'views/components/main/parts/countdown-timer.es'

import {
  repairEstimate,
  getHPLabelStyle,
  getCountdownLabelStyle,
  AKASHI_INTERVAL,
} from './functions'

// const constShipsSelector = createSelector(
//   constSelector,
//   (_const) => _.keyBy(_const.$ships, 'api_id')
// )

const { ROOT, i18n } = window
const __ = i18n["poi-plugin-anchorage-repair"].__.bind(i18n["poi-plugin-anchorage-repair"])

export const ShipRow = connect(
  (state) =>{
    const $ships = state.const.$ships
    const canNotify = state.misc.canNotify
    return {
      $ships,
      canNotify,
    }
  }
)(class ShipRowClass extends Component {
  static basicNotifyConfig = {
    type: 'repair',
    title: __('Anchorage repair'),
    message: (names) => `${_.join(names, ', ')} ${__('anchorage repair completed')}`,
    icon: join(ROOT, 'assets', 'img', 'operation', 'repair.png'),
    preemptTime: 60,
    groupKey: 'plugin-anchorage-repair',
  }

  render() {
    const {timeElapsed, lastRefresh, canRepair, ship, $ships, canNotify} = this.props
    const {api_nowhp, api_maxhp, availableSRF, estimate, timePerHP, api_id, api_ship_id, api_lv} = ship
    let completeTime = lastRefresh + estimate
    let preemptTime =  (estimate - AKASHI_INTERVAL >= (60 * 1000)) ? 60 : Math.round((estimate - AKASHI_INTERVAL)/1000)
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
            getNotifyOptions={ () => canNotify && (lastRefresh > 0) && {
              ...this.constructor.basicNotifyConfig,
              completeTime,
              preemptTime,
              args: [$ships[api_ship_id].api_name],
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