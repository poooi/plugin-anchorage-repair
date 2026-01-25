import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { HTMLTable, Tag, Callout } from '@blueprintjs/core'
import { Tooltip } from 'views/components/etc/overlay'
import _ from 'lodash'

import CountupTimer from './countup-timer'
import { AKASHI_INTERVAL } from './functions'
import ShipRow from './ship-row'
import {
  createFleetBasicInfoSelector,
  createFleetStatusSelector,
  createFleetRepairCountSelector,
  createFleetRepairDetailSelector,
} from './fleet-selectors'

interface FleetListProps {
  fleetId: number
}

interface GameResponseEvent extends CustomEvent {
  detail: {
    path: string
    postBody: {
      api_id?: string
      api_ship_id?: string
      api_highspeed?: number
    }
  }
}

const GridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1em;
`

const InfoRow = styled.div`
  display: flex;
  padding: 2em 0;
  gap: 1em;
`

const InfoCol = styled.div<{ $xs?: number }>`
  flex: ${(props) => (props.$xs === 4 ? '1' : '0 0 auto')};
  align-content: center;
  text-align: center;
`

const HiddenCallout = styled(Callout)<{ $hidden: boolean }>`
  display: ${(props) => (props.$hidden ? 'none' : 'block')};
`

const StyledTable = styled(HTMLTable)`
  width: 100%;

  td,
  th {
    text-align: center;
    vertical-align: middle;
  }
`

const RowContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const ColContainer = styled.div<{ $xs?: number }>`
  width: 100%;
`

const FleetList: React.FC<FleetListProps> = ({ fleetId }) => {
  const [lastRefresh, setLastRefresh] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const { t } = useTranslation('poi-plugin-anchorage-repair')

  // Create selectors for this specific fleet
  const basicInfoSelector = useMemo(
    () => createFleetBasicInfoSelector(fleetId),
    [fleetId],
  )
  const statusSelector = useMemo(
    () => createFleetStatusSelector(fleetId),
    [fleetId],
  )
  const repairCountSelector = useMemo(
    () => createFleetRepairCountSelector(fleetId),
    [fleetId],
  )
  const repairDetailSelector = useMemo(
    () => createFleetRepairDetailSelector(fleetId),
    [fleetId],
  )

  const basicInfo = useSelector(basicInfoSelector)
  const status = useSelector(statusSelector)
  const repairCount = useSelector(repairCountSelector)
  const repairDetail = useSelector(repairDetailSelector)

  const handleResponse = useCallback(
    (e: Event) => {
      if (!basicInfo) return
      const event = e as GameResponseEvent
      const { path, postBody } = event.detail

      switch (path) {
        case '/kcsapi/api_port/port':
          if (timeElapsed >= AKASHI_INTERVAL / 1000 || lastRefresh === 0) {
            setLastRefresh(Date.now())
            setTimeElapsed(0)
          }
          break

        case '/kcsapi/api_req_hensei/change': {
          const changedFleetId = parseInt(postBody.api_id || '', 10)
          const shipId = parseInt(postBody.api_ship_id || '', 10)
          if (
            !Number.isNaN(changedFleetId) &&
            changedFleetId === basicInfo.api_id &&
            shipId >= 0
          ) {
            if (timeElapsed < AKASHI_INTERVAL / 1000) {
              setLastRefresh(Date.now())
              setTimeElapsed(0)
            } else if (shipId < 0) {
              // do nothing
            } else {
              // since it has passed more than 20 minutes, need to refresh the hp
              setLastRefresh(0)
            }
          }
          break
        }
        case '/kcsapi/api_req_nyukyo/start': {
          const shipId = parseInt(postBody.api_ship_id || '', 10)
          const infleet = _.filter(basicInfo.shipId, (id) => shipId === id)
          if (postBody.api_highspeed === 1 && infleet.length > 0) {
            setLastRefresh(Date.now())
          }
          break
        }
        default:
      }
    },
    [basicInfo, timeElapsed, lastRefresh],
  )

  useEffect(() => {
    window.addEventListener('game.response', handleResponse)
    return () => {
      window.removeEventListener('game.response', handleResponse)
    }
  }, [handleResponse])

  const tick = useCallback((elapsed: number) => {
    if (elapsed % 5 === 0) {
      // limit component refresh rate
      setTimeElapsed(elapsed)
    }
  }, [])

  const resetTimeElapsed = useCallback(() => {
    setTimeElapsed(0)
  }, [])

  // Early return if fleet not found
  if (!basicInfo || !status) {
    return null
  }

  const tooltipContent = (
    <div>
      <p>{status.canRepair ? t('Akashi loves you!') : ''}</p>
      <p>{status.akashiFlagship ? '' : t('Akashi not flagship')}</p>
      <p>{status.inExpedition ? t('fleet in expedition') : ''}</p>
      <p>{status.flagShipInRepair ? t('flagship in dock') : ''}</p>
    </div>
  )

  return (
    <GridContainer>
      <InfoRow>
        <InfoCol $xs={4}>
          <Tooltip content={tooltipContent} placement="bottom">
            <Tag
              intent={status.canRepair ? 'success' : 'warning'}
              interactive={status.canRepair}
            >
              {status.canRepair ? t('Repairing') : t('Not ready')}
            </Tag>
          </Tooltip>
        </InfoCol>
        <InfoCol $xs={4}>
          <Tag intent={status.canRepair ? 'success' : 'warning'}>
            <span>{t('elapsed')} </span>
            <CountupTimer
              countdownId={`akashi-${basicInfo.api_id}`}
              startTime={lastRefresh}
              tickCallback={tick}
              startCallback={resetTimeElapsed}
            />
          </Tag>
        </InfoCol>
        <InfoCol $xs={4}>
          <Tag intent={repairCount ? 'success' : 'warning'}>
            {t('capacity-count', { count: repairCount })}
          </Tag>
        </InfoCol>
      </InfoRow>
      <RowContainer>
        <ColContainer $xs={12}>
          <HiddenCallout intent="warning" $hidden={lastRefresh !== 0}>
            {t('refresh_notice')}
          </HiddenCallout>
        </ColContainer>
      </RowContainer>
      <RowContainer>
        <ColContainer $xs={12}>
          <StyledTable striped bordered>
            <thead>
              <tr>
                <th>{t('Ship')}</th>
                <th>{t('HP')}</th>
                <th>
                  <Tooltip content={t('Total time required')} placement="top">
                    <span>{t('Akashi Time')}</span>
                  </Tooltip>
                </th>
                <th>
                  <Tooltip
                    content={t('Time required for 1 HP recovery')}
                    placement="top"
                  >
                    <span>{t('Per HP')}</span>
                  </Tooltip>
                </th>
                <th>
                  <Tooltip
                    content={t('Estimated HP recovery since last refresh')}
                    placement="top"
                  >
                    <span>{t('Estimated repaired')}</span>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {_.map(repairDetail, (ship) => (
                <ShipRow
                  key={`anchorage-ship-${ship.api_id}`}
                  ship={ship}
                  lastRefresh={lastRefresh}
                  timeElapsed={timeElapsed}
                  canRepair={status.canRepair}
                />
              ))}
            </tbody>
          </StyledTable>
        </ColContainer>
      </RowContainer>
    </GridContainer>
  )
}

export default FleetList
