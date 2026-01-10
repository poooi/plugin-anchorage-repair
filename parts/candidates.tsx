import React, { Component } from 'react'
import { createSelector } from 'reselect'
import { connect } from 'react-redux'
import fp from 'lodash/fp'
import { mapValues, findIndex, includes, map } from 'lodash'
import { AutoSizer, List } from 'react-virtualized'
import { ButtonGroup, Button } from 'react-bootstrap'
import FA from 'react-fontawesome'
import chroma from 'chroma-js'

import {
  repairsSelector,
  fleetShipsIdSelectorFactory,
} from 'views/utils/selectors'
import { resolveTime } from 'views/utils/tools'

import { akashiEstimate, timePerHPCalc } from './functions'

const { i18n } = window
const __ = i18n['poi-plugin-anchorage-repair'].__.bind(
  i18n['poi-plugin-anchorage-repair'],
)

const sortable = ['HP', 'Akashi Time', 'Per HP']

const getSortValue = (sortIndex) => (ship) => {
  const direction = sortIndex % 2 ? -1 : 1

  switch (parseInt(sortIndex / 2, 10)) {
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
  [(state) => state.info.ships, allFleetShipIdSelector],
  (ships, fleetIds) =>
    mapValues(ships, (ship) =>
      findIndex(fleetIds, (fleetId) => includes(fleetId, ship.api_id)),
    ),
)

const repairIdSelector = createSelector([repairsSelector], (repair) =>
  map(repair, (dock) => dock.api_ship_id),
)

const candidateShipsSelector = (sortIndex) =>
  createSelector(
    [
      (state) => state.info.ships,
      (state) => state.const.$ships,
      shipFleetIdMapSelector,
      repairIdSelector,
    ],
    (ships, $ships, shipFleetIdMap, repairIds) =>
      fp.flow(
        fp.filter(
          (ship) =>
            akashiEstimate(ship) > 0 && !includes(repairIds, ship.api_id),
        ),
        fp.map((ship) => ({
          ...$ships[ship.api_ship_id],
          ...ship,
          akashi: akashiEstimate(ship),
          perHP: timePerHPCalc(ship),
          fleetId: shipFleetIdMap[ship.api_id],
        })),
        fp.sortBy((ship) => getSortValue(sortIndex)(ship)),
      )(ships),
  )

const getHPBackgroundColor = (nowhp, maxhp) => {
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

// console.log(
//   chroma.mix('rgb(253, 216, 53)', 'rgb(67, 160, 71)', 0.5, 'lch').alpha(0.6).css(),
//   chroma.mix('rgb(253, 216, 53)', 'rgb(67, 160, 71)', 0.5, 'rgb').alpha(0.6).css(),
//   chroma.mix('rgb(253, 216, 53)', 'rgb(67, 160, 71)', 0.5, 'hsl').alpha(0.6).css(),
//   chroma.mix('rgb(253, 216, 53)', 'rgb(67, 160, 71)', 0.5, 'lab').alpha(0.6).css(),
// )
// (nowhp / maxhp) > 0.75 ? 'rgba(67, 160, 71, 0.6)' : 'rgba(253, 216, 53, 0.6)'

const Candidates = connect((state, { sortIndex = 0 }) => ({
  ships: candidateShipsSelector(sortIndex)(state),
}))(
  class Candidates extends Component {
    rowRenderer = ({ key, index, style }) => {
      const { ships } = this.props
      const ship = ships[index]
      const color = getHPBackgroundColor(ship.api_nowhp, ship.api_maxhp)
      const percentage = Math.round((100 * ship.api_nowhp) / ship.api_maxhp)
      return (
        <div
          className="candidate-ship-item"
          style={{
            ...style,
            background: `linear-gradient(90deg, ${color} ${percentage}%, rgba(0, 0, 0, 0) 50%)`,
          }}
          key={key}
        >
          <span className="ship-name">
            {`Lv.${ship.api_lv} ${window.i18n.resources.__(ship.api_name)}${
              ship.fleetId < 0 ? '' : `/${ship.fleetId + 1}`
            }`}
          </span>
          <span
            style={{ marginLeft: '1em' }}
          >{`(${ship.api_nowhp} / ${ship.api_maxhp})`}</span>
          <span style={{ marginLeft: '2em' }}>{`${resolveTime(
            ship.akashi / 1000,
          )} / ${resolveTime(ship.perHP / 1000)}`}</span>
        </div>
      )
    }

    render() {
      const { ships, sortIndex } = this.props
      return (
        <div id="candidate-list">
          <div style={{ marginBottom: '1ex' }}>
            <ButtonGroup bsSize="small">
              {[...new Array(6).keys()].map((index) => (
                <Button
                  key={index}
                  onClick={this.props.handleSort(index)}
                  bsStyle={index === sortIndex ? 'success' : 'default'}
                >
                  {__(sortable[parseInt(index / 2, 10)])}
                  <FA name={index % 2 === 0 ? 'arrow-up' : 'arrow-down'} />
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <AutoSizer>
            {({ height, width }) => (
              <List
                sortIndex={sortIndex}
                height={height}
                width={width}
                rowHeight={40}
                rowCount={ships.length}
                rowRenderer={this.rowRenderer}
              />
            )}
          </AutoSizer>
        </div>
      )
    }
  },
)

export default Candidates
