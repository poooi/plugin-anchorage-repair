import React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { join } from 'path'
import { Tag } from '@blueprintjs/core'
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

const LvLabel = styled.span`
  display: block;
  font-size: 70%;
`

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
        {t(api_name, { ns: 'resources' })}
        <LvLabel>Lv.{api_lv}</LvLabel>
      </td>
      <td>
        <Tag
          intent={
            getHPLabelStyle(api_nowhp, api_maxhp, availableSRF, inRepair) as
              | 'success'
              | 'warning'
              | 'danger'
              | 'none'
          }
        >
          {`${api_nowhp} / ${api_maxhp}`}
        </Tag>
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
                  return undefined
                }
                return {
                  ...basicNotifyConfig,
                  completeTime,
                  args: t(api_name, { ns: 'resources' }),
                }
              }}
            />
          ) : inRepair ? (
            <Tag intent="success">
              <FontAwesome name="wrench" /> {t('Docking')}
            </Tag>
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
