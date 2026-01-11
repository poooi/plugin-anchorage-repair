import React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { join } from 'path'
import { Label } from 'react-bootstrap'
import FontAwesome from 'react-fontawesome'

import { resolveTime } from 'views/utils/tools'
import { CountdownNotifierLabel } from 'views/components/main/parts/countdown-timer'

import {
  repairEstimate,
  getHPLabelStyle,
  getCountdownLabelStyle,
} from './functions'
import { RootState } from '../poi-types'

declare global {
  interface Window {
    ROOT: string
    i18n: {
      resources: {
        __: (key: string) => string
      }
    }
  }
}

interface ShipData {
  api_id: number
  api_name: string
  api_lv: number
  api_nowhp: number
  api_maxhp: number
  availableSRF: boolean
  estimate: number
  timePerHP: number
  inRepair: boolean
}

interface ShipRowProps {
  timeElapsed: number
  lastRefresh: number
  ship: ShipData
  canRepair: boolean
}

const ShipRow: React.FC<ShipRowProps> = ({
  timeElapsed,
  lastRefresh,
  canRepair,
  ship,
}) => {
  const canNotify = useSelector((state: RootState) => state.misc.canNotify)
  const { t } = useTranslation()

  const {
    api_nowhp,
    api_maxhp,
    availableSRF,
    estimate,
    timePerHP,
    api_id,
    api_lv,
    inRepair,
    api_name,
  } = ship

  const completeTime = lastRefresh + estimate

  const basicNotifyConfig = {
    type: 'repair',
    title: t('Anchorage repair'),
    message: t('anchorage repair completed'),
    icon: join(window.ROOT, 'assets', 'img', 'operation', 'repair.png'),
    preemptTime: 0,
    groupKey: 'plugin-anchorage-repair',
  }

  return (
    <tr>
      <td>
        {window.i18n.resources.__(api_name)}
        <span className="lv-label">Lv.{api_lv}</span>
      </td>
      <td>
        <Label
          bsStyle={getHPLabelStyle(
            api_nowhp,
            api_maxhp,
            availableSRF,
            inRepair,
          )}
        >
          {`${api_nowhp} / ${api_maxhp}`}
        </Label>
      </td>
      <td>
        {estimate > 0 &&
          canRepair &&
          availableSRF &&
          (!inRepair ? (
            <CountdownNotifierLabel
              timerKey={`anchorage-ship-${api_id}`}
              completeTime={completeTime}
              getLabelStyle={getCountdownLabelStyle}
              getNotifyOptions={() => {
                if (!canNotify || lastRefresh <= 0) {
                  return undefined as any
                }
                return {
                  ...basicNotifyConfig,
                  completeTime,
                  args: window.i18n.resources.__(api_name),
                }
              }}
            />
          ) : inRepair ? (
            <Label bsStyle="success">
              <FontAwesome name="wrench" /> {t('Docking')}
            </Label>
          ) : (
            ''
          ))}
      </td>
      <td>{timePerHP ? resolveTime(timePerHP / 1000) : ''}</td>
      <td>
        {canRepair &&
          api_nowhp !== api_maxhp &&
          !inRepair &&
          repairEstimate(ship, timeElapsed, availableSRF)}
      </td>
    </tr>
  )
}

export default ShipRow
