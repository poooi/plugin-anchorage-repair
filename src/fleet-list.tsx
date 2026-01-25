import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { HTMLTable, Tag, Callout } from '@blueprintjs/core'
import { Tooltip } from 'views/components/etc/overlay'
import _ from 'lodash'
import { shipsSelector } from 'views/utils/selectors'

import CountupTimer from './countup-timer'
import { AKASHI_INTERVAL, NOSAKI_INTERVAL } from './functions'
import { timerState } from './timer-state'
import { NOSAKI_ID_LIST } from './fleet-utils'
import ShipRow from './ship-row'
import {
  createFleetBasicInfoSelector,
  createFleetStatusSelector,
  createFleetRepairCountSelector,
  createFleetRepairDetailSelector,
} from './fleet-selectors'
import type { APIReqHenseiChangeRequest } from 'kcsapi/api_req_hensei/change/request'
import type { APIReqHenseiPresetSelectRequest } from 'kcsapi/api_req_hensei/preset_select/request'
import type { APIReqMissionStartRequest } from 'kcsapi/api_req_mission/start/request'
import type { APIReqNyukyoStartRequest } from 'kcsapi/api_req_nyukyo/start/request'
import type { APIReqKaisouRemodelingRequest } from 'kcsapi/api_req_kaisou/remodeling/request'

interface FleetListProps {
  fleetId: number
}

type GameResponsePostBody =
  | APIReqHenseiChangeRequest
  | APIReqHenseiPresetSelectRequest
  | APIReqMissionStartRequest
  | APIReqNyukyoStartRequest
  | APIReqKaisouRemodelingRequest
  | Record<string, string | number | undefined>

interface GameResponseEvent extends CustomEvent {
  detail: {
    path: string
    postBody: GameResponsePostBody
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
  const [lastRefresh, setLastRefresh] = useState(0) // Per-fleet Akashi timer
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [moraleTimeElapsed, setMoraleTimeElapsed] = useState(0)
  const { t } = useTranslation('poi-plugin-anchorage-repair')

  // Subscribe to global Nosaki timer state changes
  useEffect(() => {
    const unsubscribe = timerState.subscribe(() => {
      // Force component to re-render when global Nosaki timer changes
      const lastRefresh = timerState.getLastNosakiRefresh()
      setMoraleTimeElapsed(lastRefresh > 0 ? (Date.now() - lastRefresh) / 1000 : 0)
    })
    return unsubscribe
  }, [])

  const lastMoraleRefresh = timerState.getLastNosakiRefresh() // Global Nosaki timer

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
  const ships = useSelector(shipsSelector) // Need ships for checking Nosaki in slots

  const handleResponse = useCallback(
    (e: Event) => {
      if (!basicInfo || !status) return // Null check to prevent crashes
      const event = e as GameResponseEvent
      const { path, postBody } = event.detail

      switch (path) {
        case '/kcsapi/api_port/port':
          // Refresh Akashi timer (per-fleet) when returning to port
          if (timeElapsed >= AKASHI_INTERVAL / 1000 || lastRefresh === 0) {
            setLastRefresh(Date.now())
            setTimeElapsed(0)
          }
          // Nosaki timer: only reset if eligible AND timer has elapsed
          // Wiki: if not eligible after 15min, timer keeps running until next eligible port entry
          // Also initialize timer if Nosaki present but timer not started yet
          if (status.nosakiPresent) {
            if (lastMoraleRefresh === 0) {
              // Timer not started yet - start it now
              timerState.setLastNosakiRefresh(Date.now())
              setMoraleTimeElapsed(0)
            } else if (status.canBoostMorale && moraleTimeElapsed >= NOSAKI_INTERVAL / 1000) {
              // Eligible and timer elapsed - apply boost and reset timer
              timerState.setLastNosakiRefresh(Date.now())
              setMoraleTimeElapsed(0)
            }
          }
          // If timer not started yet or not eligible or not elapsed, keep timer as is
          break

        case '/kcsapi/api_req_hensei/preset_select':
          // Fleet preset loading doesn't reset timer (wiki requirement)
          // Do nothing - this is intentional
          break

        case '/kcsapi/api_req_hensei/change': {
          const body = postBody as APIReqHenseiChangeRequest
          const changedFleetId = parseInt(body.api_id, 10)
          const shipId = parseInt(body.api_ship_id, 10)
          const shipIdx = parseInt(body.api_ship_idx, 10)
          if (
            !Number.isNaN(changedFleetId) &&
            changedFleetId === basicInfo.api_id
          ) {
            // For Akashi: reset timer if under 20 minutes, otherwise require port refresh
            if (shipId >= 0) {
              if (timeElapsed < AKASHI_INTERVAL / 1000) {
                setLastRefresh(Date.now())
                setTimeElapsed(0)
              } else {
                // Over 20 minutes - need to refresh at port
                setLastRefresh(0)
              }
            }
            // shipId < 0: Removing ship (drag out or disband) doesn't reset - do nothing
            
            // For Nosaki: Start timer when placed in slot 1/2, clear when removed
            // shipIdx is 0-based position, so 0 = flagship, 1 = second position
            if (!Number.isNaN(shipIdx) && (shipIdx === 0 || shipIdx === 1)) {
              // Check current ship in this slot (before the change)
              const currentShipId = basicInfo.shipId?.[shipIdx]
              const currentShip = currentShipId ? ships[currentShipId] : null
              const wasNosaki = currentShip && NOSAKI_ID_LIST.includes(currentShip.api_ship_id)
              
              if (shipId >= 0) {
                // Placing a ship in slot 1 or 2
                const newShip = ships[shipId]
                const isNosaki = newShip && NOSAKI_ID_LIST.includes(newShip.api_ship_id)
                
                if (isNosaki) {
                  // Placing Nosaki - start/reset timer
                  // Compute elapsed time directly from lastMoraleRefresh (not stale state)
                  const elapsedTime = lastMoraleRefresh > 0 
                    ? (Date.now() - lastMoraleRefresh) / 1000 
                    : 0
                  if (elapsedTime < NOSAKI_INTERVAL / 1000) {
                    timerState.resetNosakiTimer()
                    setMoraleTimeElapsed(0)
                  }
                  // After 15 min: don't reset
                } else if (wasNosaki) {
                  // Replacing Nosaki with non-Nosaki - clear timer
                  timerState.clearNosakiTimer()
                  setMoraleTimeElapsed(0)
                }
              } else if (wasNosaki) {
                // Removing Nosaki from slot 1 or 2 - clear timer
                timerState.clearNosakiTimer()
                setMoraleTimeElapsed(0)
              }
            } else if (status.nosakiPresent && !Number.isNaN(shipIdx)) {
              // Composition change in other slots while Nosaki is in slot 1/2
              // Wiki: before 15min, ANY composition changes reset timer (not just additions)
              // Compute elapsed time directly from lastMoraleRefresh (not stale state)
              const elapsedTime = lastMoraleRefresh > 0 
                ? (Date.now() - lastMoraleRefresh) / 1000 
                : 0
              if (elapsedTime < NOSAKI_INTERVAL / 1000) {
                // Before 15 min, composition changes reset timer (including removals)
                timerState.resetNosakiTimer()
                setMoraleTimeElapsed(0)
              }
              // After 15 min: composition changes don't reset
            }
          }
          break
        }

        case '/kcsapi/api_req_kaisou/remodeling':
          // Ship remodeling (including Nosaki -> Nosaki Kai) doesn't reset timer after activation
          // Do nothing - this is intentional per wiki
          break

        case '/kcsapi/api_req_mission/start': {
          // Sending fleet to expedition resets Akashi timer
          // Wiki: "not in expedition" is an eligibility condition for Nosaki, not a timer reset trigger
          const body = postBody as APIReqMissionStartRequest
          const expedFleetId = parseInt(body.api_deck_id, 10)
          if (!Number.isNaN(expedFleetId) && expedFleetId === basicInfo.api_id) {
            setLastRefresh(Date.now())
            setTimeElapsed(0)
            // Note: Nosaki timer NOT reset on expedition start per wiki analysis
          }
          break
        }

        case '/kcsapi/api_req_nyukyo/start': {
          const body = postBody as APIReqNyukyoStartRequest
          const shipId = parseInt(body.api_ship_id, 10)
          const infleet = _.filter(basicInfo.shipId, (id) => shipId === id)
          // Only instant repair (bucket) resets Akashi timer
          // api_highspeed is "1" (string) when using bucket
          if (body.api_highspeed === '1' && infleet.length > 0) {
            setLastRefresh(Date.now())
            // Note: Wiki doesn't explicitly mention bucket resetting Nosaki timer
            // Keeping Akashi behavior only for now
          }
          break
        }
        default:
      }
    },
    [basicInfo, timeElapsed, lastRefresh, moraleTimeElapsed, lastMoraleRefresh, status, ships],
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

  const tickMorale = useCallback((elapsed: number) => {
    if (elapsed % 5 === 0) {
      // limit component refresh rate
      setMoraleTimeElapsed(elapsed)
    }
  }, [])

  const resetTimeElapsed = useCallback(() => {
    setTimeElapsed(0)
  }, [])

  const resetMoraleTimeElapsed = useCallback(() => {
    setMoraleTimeElapsed(0)
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

  const moraleTooltipContent = (
    <div>
      <p>{status.canBoostMorale ? t('Nosaki ready!') : ''}</p>
      <p>{status.nosakiPosition >= 0 ? '' : t('Nosaki not in position')}</p>
      <p>{status.inExpedition ? t('fleet in expedition') : ''}</p>
    </div>
  )

  const hasAnyActivity = status.canRepair || status.nosakiPresent

  return (
    <GridContainer>
      <InfoRow>
        {status.canRepair && (
          <>
            <InfoCol $xs={4}>
              <Tooltip content={tooltipContent} placement="bottom">
                <Tag
                  intent={status.canRepair ? 'success' : 'warning'}
                  interactive={status.canRepair}
                >
                  {t('HP Repair')}
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
          </>
        )}
        {status.nosakiPresent && (
          <>
            <InfoCol $xs={4}>
              <Tooltip content={moraleTooltipContent} placement="bottom">
                <Tag
                  intent={status.canBoostMorale ? 'success' : 'warning'}
                  interactive={status.nosakiPresent}
                >
                  {t('Morale Boost')}
                </Tag>
              </Tooltip>
            </InfoCol>
            <InfoCol $xs={4}>
              <Tag intent={status.canBoostMorale ? 'success' : 'warning'}>
                <span>{t('elapsed')} </span>
                <CountupTimer
                  countdownId={`nosaki-${basicInfo.api_id}`}
                  startTime={lastMoraleRefresh}
                  tickCallback={tickMorale}
                  startCallback={resetMoraleTimeElapsed}
                />
              </Tag>
            </InfoCol>
          </>
        )}
        {!hasAnyActivity && (
          <InfoCol $xs={4}>
            <Tag intent="warning">{t('Not ready')}</Tag>
          </InfoCol>
        )}
      </InfoRow>
      <RowContainer>
        <ColContainer $xs={12}>
          <HiddenCallout
            intent="warning"
            $hidden={
              (!status.canRepair || lastRefresh !== 0) &&
              (!status.nosakiPresent || lastMoraleRefresh !== 0)
            }
          >
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
                {status.canRepair && (
                  <>
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
                  </>
                )}
                {status.nosakiPresent && (
                  <th>
                    <Tooltip content={t('Morale boost per application')} placement="top">
                      <span>{t('Morale Boost')}</span>
                    </Tooltip>
                  </th>
                )}
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
                  canBoostMorale={status.nosakiPresent}
                  moraleTimeElapsed={moraleTimeElapsed}
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
