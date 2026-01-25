import React, { useMemo, useState, useRef } from 'react'
import { createSelector } from 'reselect'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { HTMLTable } from '@blueprintjs/core'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import fp from 'lodash/fp'
import { mapValues, findIndex, includes, map } from 'lodash'
import chroma from 'chroma-js'

import {
  repairsSelector,
  fleetShipsIdSelectorFactory,
} from 'views/utils/selectors'
import { resolveTime } from 'views/utils/tools'

import { akashiEstimate, timePerHPCalc, nosakiMoraleEstimate } from './functions'
import { APIShip } from 'kcsapi/api_port/port/response'
import { APIMstShip } from 'kcsapi/api_start2/getData/response'
import { RootState } from '../poi-types'

interface EnhancedShip extends APIShip {
  akashi: number
  perHP: number
  fleetId: number
  api_name: string
  api_stype: number
  hpPercentage: number
  canBoostMorale: boolean
  moraleBoostAmount: number
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

const candidateShipsSelector = createSelector(
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
        (ship: APIShip): EnhancedShip => {
          const constShip = $ships[ship.api_ship_id]
          return {
            ...$ships[ship.api_ship_id],
            ...ship,
            akashi: akashiEstimate(ship),
            perHP: timePerHPCalc(ship),
            fleetId: shipFleetIdMap[ship.api_id],
            hpPercentage: ship.api_nowhp / ship.api_maxhp,
            canBoostMorale: false, // Candidates are for repair, not morale boost
            moraleBoostAmount: 0,
          }
        },
      ),
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

const StyledTable = styled(HTMLTable)`
  width: 100%;
  border-collapse: collapse;

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  thead th {
    padding: 0.5em;
    text-align: left;
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }

  tbody {
    display: grid;
    position: relative;
  }

  tbody td {
    padding: 0.5em;
    vertical-align: middle;
  }
`

const TableRow = styled.tr<{
  $background: string
  $percentage: number
}>`
  position: absolute;
  width: 100%;
  background: linear-gradient(
    90deg,
    ${(props) => props.$background} ${(props) => props.$percentage}%,
    rgba(0, 0, 0, 0) 50%
  );
`

const ShipName = styled.span`
  font-size: 120%;
`

const SortIndicator = styled.span`
  margin-left: 0.5em;
`

export const RepairQueue: React.FC = () => {
  const ships = useSelector(candidateShipsSelector)
  const { t } = useTranslation('poi-plugin-anchorage-repair')
  const [sorting, setSorting] = useState<SortingState>([])
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const columns = useMemo<ColumnDef<EnhancedShip>[]>(
    () => [
      {
        id: 'ship',
        header: t('Ship'),
        cell: (info) => {
          const ship = info.row.original
          return (
            <ShipName>
              {`Lv.${ship.api_lv} ${t(ship.api_name, { ns: 'resources' })}${
                ship.fleetId < 0 ? '' : `/${ship.fleetId + 1}`
              }`}
            </ShipName>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'hpPercentage',
        header: t('HP'),
        cell: (info) => {
          const ship = info.row.original
          return `(${ship.api_nowhp} / ${ship.api_maxhp})`
        },
        sortingFn: (rowA, rowB) => {
          return rowA.original.hpPercentage - rowB.original.hpPercentage
        },
      },
      {
        accessorKey: 'akashi',
        header: t('Akashi Time'),
        cell: (info) => {
          const ship = info.row.original
          return resolveTime(ship.akashi / 1000)
        },
        sortingFn: (rowA, rowB) => {
          return rowA.original.akashi - rowB.original.akashi
        },
      },
      {
        accessorKey: 'perHP',
        header: t('Per HP'),
        cell: (info) => {
          const ship = info.row.original
          return resolveTime(ship.perHP / 1000)
        },
        sortingFn: (rowA, rowB) => {
          return rowA.original.perHP - rowB.original.perHP
        },
      },
    ],
    [t],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: ships,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  return (
    <CandidateListContainer id="candidate-list">
      <ScrollContainer ref={tableContainerRef}>
        <StyledTable>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {header.column.getIsSorted() && (
                      <SortIndicator>
                        {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                      </SortIndicator>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null
              const ship = row.original
              const color = getHPBackgroundColor(ship.api_nowhp, ship.api_maxhp)
              const percentage = Math.round(
                (100 * ship.api_nowhp) / ship.api_maxhp,
              )
              return (
                <TableRow
                  key={row.id}
                  $background={color}
                  $percentage={percentage}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </TableRow>
              )
            })}
          </tbody>
        </StyledTable>
      </ScrollContainer>
    </CandidateListContainer>
  )
}
