import React from 'react'
import { createSelector } from 'reselect'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { ButtonGroup, Button } from '@blueprintjs/core'
import fp from 'lodash/fp'
import { mapValues, findIndex, includes, map } from 'lodash'
import FA from 'react-fontawesome'
import chroma from 'chroma-js'

import {
  repairsSelector,
  fleetShipsIdSelectorFactory,
} from 'views/utils/selectors'
import { resolveTime } from 'views/utils/tools'

import { akashiEstimate, timePerHPCalc } from './functions'
import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { RootState } from '../poi-types'

const sortable = ['HP', 'Akashi Time', 'Per HP']

interface EnhancedShip extends APIShip {
  akashi: number
  perHP: number
  fleetId: number
  api_name: string
  api_stype: number
}

const getSortValue = (sortIndex: number) => (ship: EnhancedShip) => {
  const direction = sortIndex % 2 ? -1 : 1

  switch (Math.floor(sortIndex / 2)) {
    case 0:
      return (ship.api_nowhp / ship.api_maxhp) * direction
    case 1:
      return ship.akashi * direction
    case 2:
      return ship.perHP * direction
    default:
      return ship.api_id
  }
}

const allFleetShipIdSelector = createSelector(
  [
    ...[...new Array(4).keys()].map((fleetId) =>
      fleetShipsIdSelectorFactory(fleetId),
    ),
  ],
  (id1, id2, id3, id4) => [id1, id2, id3, id4],
)

const shipFleetIdMapSelector = createSelector(
  [(state: RootState) => state.info.ships, allFleetShipIdSelector],
  (ships, fleetIds) =>
    mapValues(ships, (ship) =>
      findIndex(fleetIds, (fleetId) => includes(fleetId, ship.api_id)),
    ),
)

const repairIdSelector = createSelector([repairsSelector], (repair) =>
  map(repair, (dock) => dock.api_ship_id),
)

const candidateShipsSelector = (sortIndex: number) =>
  createSelector(
    [
      (state: RootState) => state.info.ships,
      (state: RootState) => state.const.$ships,
      shipFleetIdMapSelector,
      repairIdSelector,
    ],
    (
      ships: Record<number, APIShip>,
      $ships: Record<number, APIMstShip>,
      shipFleetIdMap: Record<number, number>,
      repairIds: number[],
    ): EnhancedShip[] =>
      fp.flow(
        fp.filter(
          (ship: APIShip) =>
            akashiEstimate(ship) > 0 && !includes(repairIds, ship.api_id),
        ),
        fp.map(
          (ship: APIShip): EnhancedShip => ({
            ...$ships[ship.api_ship_id],
            ...ship,
            akashi: akashiEstimate(ship),
            perHP: timePerHPCalc(ship),
            fleetId: shipFleetIdMap[ship.api_id],
          }),
        ),
        fp.sortBy((ship: EnhancedShip) => getSortValue(sortIndex)(ship)),
      )(ships),
  )

const getHPBackgroundColor = (nowhp: number, maxhp: number): string => {
  const percentage = nowhp / maxhp
  return percentage > 0.75
    ? chroma
        .mix(
          'rgb(253, 216, 53)',
          'rgb(67, 160, 71)',
          (percentage - 0.75) / 0.25,
          'lab',
        )
        .alpha(0.6)
        .css()
    : chroma
        .mix(
          'rgb(245, 124, 0)',
          'rgb(253, 216, 53)',
          (percentage - 0.5) / 0.25,
          'lab',
        )
        .alpha(0.6)
        .css()
}

const CandidateListContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const ScrollContainer = styled.div`
  flex: 1;
  overflow: auto;

  ::-webkit-scrollbar {
    width: 1em;
  }
`

const CandidateShipItem = styled.div<{
  $background: string
  $percentage: number
}>`
  display: flex;
  align-items: center;
  padding: 0.5em;
  background: linear-gradient(
    90deg,
    ${(props) => props.$background} ${(props) => props.$percentage}%,
    rgba(0, 0, 0, 0) 50%
  );
`

const ShipName = styled.span`
  font-size: 120%;
`

const ButtonGroupContainer = styled.div`
  margin-bottom: 1ex;
`

const HPSpan = styled.span`
  margin-left: 1em;
`

const TimeSpan = styled.span`
  margin-left: 2em;
`

interface CandidatesProps {
  handleSort: (index: number) => () => void
  sortIndex: number
}

const Candidates: React.FC<CandidatesProps> = ({ handleSort, sortIndex }) => {
  const ships = useSelector((state: RootState) =>
    candidateShipsSelector(sortIndex)(state),
  )
  const { t } = useTranslation('poi-plugin-anchorage-repair')

  return (
    <CandidateListContainer id="candidate-list">
      <ButtonGroupContainer>
        <ButtonGroup>
          {[...new Array(6).keys()].map((index) => (
            <Button
              key={index}
              onClick={handleSort(index)}
              intent={index === sortIndex ? 'success' : 'none'}
              small
            >
              {t(sortable[Math.floor(index / 2)])}
              <FA name={index % 2 === 0 ? 'arrow-up' : 'arrow-down'} />
            </Button>
          ))}
        </ButtonGroup>
      </ButtonGroupContainer>
      <ScrollContainer>
        {ships.map((ship) => {
          const color = getHPBackgroundColor(ship.api_nowhp, ship.api_maxhp)
          const percentage = Math.round((100 * ship.api_nowhp) / ship.api_maxhp)
          return (
            <CandidateShipItem
              key={ship.api_id}
              $background={color}
              $percentage={percentage}
            >
              <ShipName>
                {`Lv.${ship.api_lv} ${t(ship.api_name, { ns: 'resources' })}${
                  ship.fleetId < 0 ? '' : `/${ship.fleetId + 1}`
                }`}
              </ShipName>
              <HPSpan>{`(${ship.api_nowhp} / ${ship.api_maxhp})`}</HPSpan>
              <TimeSpan>{`${resolveTime(ship.akashi / 1000)} / ${resolveTime(
                ship.perHP / 1000,
              )}`}</TimeSpan>
            </CandidateShipItem>
          )
        })}
      </ScrollContainer>
    </CandidateListContainer>
  )
}

export default Candidates
