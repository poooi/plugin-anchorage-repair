import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { HTMLTable, Tag, Callout } from '@blueprintjs/core'
import { Tooltip } from 'views/components/etc/overlay'
import _ from 'lodash'

import CountupTimer from './countup-timer'
import { timerState } from './timer-state'
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
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [moraleTimeElapsed, setMoraleTimeElapsed] = useState(0)
  const { t } = useTranslation('poi-plugin-anchorage-repair')

  // Subscribe to global timer state changes (both Nosaki and repair timers)
  // When global timestamps change, recalculate elapsed times
  useEffect(() => {
    const updateElapsedTimes = () => {
      const lastNosakiRefresh = timerState.getLastNosakiRefresh()
      setMoraleTimeElapsed(
        lastNosakiRefresh > 0 ? (Date.now() - lastNosakiRefresh) / 1000 : 0,
      )

      const lastRepairRefresh = timerState.getLastRepairRefresh()
      setTimeElapsed(
        lastRepairRefresh > 0 ? (Date.now() - lastRepairRefresh) / 1000 : 0,
      )
    }

    const unsubscribe = timerState.subscribe(updateElapsedTimes)

    // Initial calculation
    updateElapsedTimes()

    return unsubscribe
  }, [])

  const lastMoraleRefresh = timerState.getLastNosakiRefresh() // Global Nosaki timer
  const lastRefresh = timerState.getLastRepairRefresh() // Global repair timer

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

  // Timer management is now handled globally in index.tsx
  // This component only displays the timer state

  const tick = useCallback((elapsed: number) => {
    if (elapsed % 5 === 0) {
      // Limit component refresh rate
      setTimeElapsed(elapsed)
    }
  }, [])

  const tickMorale = useCallback((elapsed: number) => {
    if (elapsed % 5 === 0) {
      // Limit component refresh rate
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
      <p>{status.canRepair ? t('Ready for repair!') : ''}</p>
      <p>{status.repairShipFlagship ? '' : t('Repair ship not flagship')}</p>
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
                      <Tooltip
                        content={t('Total time required')}
                        placement="top"
                      >
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
                    <Tooltip
                      content={t('Morale boost per application')}
                      placement="top"
                    >
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
