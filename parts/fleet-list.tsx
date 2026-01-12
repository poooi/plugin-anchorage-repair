import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import _ from 'lodash'
import {
  Table,
  Grid,
  Row,
  Col,
  OverlayTrigger,
  Tooltip,
  Label,
  Panel,
} from 'react-bootstrap'

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

const InfoRow = styled(Row)`
  padding: 2em 0;
`

const InfoCol = styled(Col)`
  align-content: center;
  text-align: center;
`

const HiddenPanel = styled(Panel)<{ $hidden: boolean }>`
  display: ${(props) => (props.$hidden ? 'none' : 'block')};
`

const StyledTable = styled(Table)`
  td,
  th {
    text-align: center;
    vertical-align: middle;
  }
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

  return (
    <Grid>
      <InfoRow>
        <InfoCol xs={4}>
          <OverlayTrigger
            placement="bottom"
            trigger={fleet.canRepair ? 'click' : ['hover', 'focus']}
            overlay={
              <Tooltip id={`anchorage-refresh-notify-${fleet.api_id}`}>
                <p>{fleet.canRepair ? t('Akashi loves you!') : ''}</p>
                <p>{fleet.akashiFlagship ? '' : t('Akashi not flagship')}</p>
                <p>{fleet.inExpedition ? t('fleet in expedition') : ''}</p>
                <p>{fleet.flagShipInRepair ? t('flagship in dock') : ''}</p>
              </Tooltip>
            }
          >
            <Label bsStyle={fleet.canRepair ? 'success' : 'warning'}>
              {fleet.canRepair ? t('Repairing') : t('Not ready')}
            </Label>
          </OverlayTrigger>
        </InfoCol>
        <InfoCol xs={4}>
          <Label bsStyle={fleet.canRepair ? 'success' : 'warning'}>
            <span>{t('Elapsed:')} </span>
            <CountupTimer
              countdownId={`akashi-${fleet.api_id}`}
              startTime={lastRefresh}
              tickCallback={tick}
              startCallback={resetTimeElapsed}
            />
          </Label>
        </InfoCol>
        <InfoCol xs={4}>
          <Label bsStyle={fleet.repairCount ? 'success' : 'warning'}>
            {t('Capacity: {{count}}', { count: fleet.repairCount })}
          </Label>
        </InfoCol>
      </InfoRow>
      <Row>
        <Col xs={12}>
          <HiddenPanel bsStyle="warning" $hidden={lastRefresh !== 0}>
            {t('refresh_notice')}
          </HiddenPanel>
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <StyledTable bordered condensed>
            <thead>
              <tr>
                <th>{t('Ship')}</th>
                <th>{t('HP')}</th>
                <th>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={'akashi-time-desc'}>
                        {t('Total time required')}
                      </Tooltip>
                    }
                  >
                    <span>{t('Akashi Time')}</span>
                  </OverlayTrigger>
                </th>
                <th>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={'akashi-time-desc'}>
                        {t('Time required for 1 HP recovery')}
                      </Tooltip>
                    }
                  >
                    <span>{t('Per HP')}</span>
                  </OverlayTrigger>
                </th>
                <th>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={'akashi-time-desc'}>
                        {t('Estimated HP recovery since last refresh')}
                      </Tooltip>
                    }
                  >
                    <span>{t('Estimated repaired')}</span>
                  </OverlayTrigger>
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
        </Col>
      </Row>
    </Grid>
  )
}

export default FleetList
