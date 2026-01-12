import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { HTMLTable, Tag, Tooltip, Callout } from '@blueprintjs/core'
import _ from 'lodash'

import CountupTimer from './countup-timer'
import { AKASHI_INTERVAL } from './functions'

import ShipRow from './ship-row'

interface FleetAkashiInfo {
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

interface FleetListProps {
  fleet: FleetAkashiInfo
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

const FleetList: React.FC<FleetListProps> = ({ fleet }) => {
  const [lastRefresh, setLastRefresh] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const { t } = useTranslation('poi-plugin-anchorage-repair')

  const handleResponse = useCallback(
    (e: Event) => {
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
          const fleetId = parseInt(postBody.api_id || '', 10)
          const shipId = parseInt(postBody.api_ship_id || '', 10)
          if (
            !Number.isNaN(fleetId) &&
            fleetId === fleet.api_id &&
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
          const infleet = _.filter(fleet.shipId, (id) => shipId === id)
          if (postBody.api_highspeed === 1 && infleet.length > 0) {
            setLastRefresh(Date.now())
          }
          break
        }
        default:
      }
    },
    [fleet.api_id, fleet.shipId, timeElapsed, lastRefresh],
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

  const tooltipContent = (
    <div>
      <p>{fleet.canRepair ? t('Akashi loves you!') : ''}</p>
      <p>{fleet.akashiFlagship ? '' : t('Akashi not flagship')}</p>
      <p>{fleet.inExpedition ? t('fleet in expedition') : ''}</p>
      <p>{fleet.flagShipInRepair ? t('flagship in dock') : ''}</p>
    </div>
  )

  return (
    <GridContainer>
      <InfoRow>
        <InfoCol $xs={4}>
          <Tooltip content={tooltipContent} placement="bottom">
            <Tag
              intent={fleet.canRepair ? 'success' : 'warning'}
              interactive={fleet.canRepair}
            >
              {fleet.canRepair ? t('Repairing') : t('Not ready')}
            </Tag>
          </Tooltip>
        </InfoCol>
        <InfoCol $xs={4}>
          <Tag intent={fleet.canRepair ? 'success' : 'warning'}>
            <span>{t('Elapsed:')} </span>
            <CountupTimer
              countdownId={`akashi-${fleet.api_id}`}
              startTime={lastRefresh}
              tickCallback={tick}
              startCallback={resetTimeElapsed}
            />
          </Tag>
        </InfoCol>
        <InfoCol $xs={4}>
          <Tag intent={fleet.repairCount ? 'success' : 'warning'}>
            {t('Capacity: {{count}}', { count: fleet.repairCount })}
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
              {_.map(fleet.repairDetail, (ship) => (
                <ShipRow
                  key={`anchorage-ship-${ship.api_id}`}
                  ship={ship}
                  lastRefresh={lastRefresh}
                  timeElapsed={timeElapsed}
                  canRepair={fleet.canRepair}
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
