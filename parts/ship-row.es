import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
// import { createSelector  } from 'reselect'
import _ from 'lodash'
import { join } from 'path'
import { Label} from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'

import { resolveTime } from 'views/utils/tools'
import { CountdownNotifierLabel } from 'views/components/main/parts/countdown-timer'

import {
  repairEstimate,
  getHPLabelStyle,
  getCountdownLabelStyle,
} from './functions'

// const constShipsSelector = createSelector(
//   constSelector,
//   (_const) => _.keyBy(_const.$ships, 'api_id')
// )

const { ROOT, i18n } = window
const __ = i18n["poi-plugin-anchorage-repair"].__.bind(i18n["poi-plugin-anchorage-repair"])

export const ShipRow = connect(
  (state) =>{
    const canNotify = state.misc.canNotify
    return {
      canNotify,
    }
  }
)(class ShipRowClass extends Component {
  static basicNotifyConfig = {
    type: 'repair',
    title: __('Anchorage repair'),
    message: (names) => `${_.join(names, ', ')} ${__('anchorage repair completed')}`,
    icon: join(ROOT, 'assets', 'img', 'operation', 'repair.png'),
    preemptTime: 0,
    groupKey: 'plugin-anchorage-repair',
  }

  static propTypes = {
    canNotify: PropTypes.bool.isRequired,
    timeElapsed: PropTypes.number.isRequired,
    lastRefresh: PropTypes.number.isRequired,
    ship: PropTypes.object.isRequired,
    canRepair: PropTypes.bool.isRequired,
  }

  render() {
    const {timeElapsed, lastRefresh, canRepair, ship, canNotify} = this.props
    const {api_nowhp, api_maxhp, availableSRF, estimate, timePerHP, api_id, api_lv, inRepair, api_name} = ship
    let completeTime = lastRefresh + estimate
    
    return(
      <tr>
        <td>
          {i18n.resources.__(api_name)}
          <span className="lv-label">Lv.{api_lv}</span>
        </td>
        <td>
          <Label bsStyle={getHPLabelStyle(api_nowhp, api_maxhp, availableSRF, inRepair)}>
            {`${api_nowhp} / ${api_maxhp}`}
          </Label>
        </td>
        <td>
        { estimate > 0 && canRepair && availableSRF && !inRepair ?
          <CountdownNotifierLabel
            timerKey={`anchorage-ship-${api_id}`}
            completeTime={completeTime}
            getLabelStyle={getCountdownLabelStyle}
            getNotifyOptions={ () => canNotify && (lastRefresh > 0) && {
              ...this.constructor.basicNotifyConfig,
              completeTime,
              args: i18n.resources.__(api_name),
            }}
          /> : (inRepair ? <Label bsStyle='success'><FontAwesome name='wrench' /> {__("Docking")}</Label> : '')
        }
        </td>
        <td>{timePerHP ? resolveTime(timePerHP / 1000) : '' }
        </td>
        <td>{canRepair && api_nowhp != api_maxhp && !inRepair && repairEstimate(ship, timeElapsed, availableSRF)}</td>
      </tr>
    )
  }
})