import type { ColumnDef, SortingState } from '@tanstack/react-table'
import type { APIShip } from 'kcsapi/api_port/port/response'
import type { APIMstShip } from 'kcsapi/api_start2/getData/response'

import { Button, Colors, HTMLTable, InputGroup, Tag } from '@blueprintjs/core'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import chroma from 'chroma-js'
import { readFile } from 'fs/promises'
import { mapValues, findIndex, includes, map } from 'lodash'
import fp from 'lodash/fp'
import { join } from 'path'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'
import styled from 'styled-components'
import {
  repairsSelector,
  fleetShipsIdSelectorFactory,
} from 'views/utils/selectors'
import { resolveTime } from 'views/utils/tools'

import type { RootState } from '../poi-types'

import FileWriter from './file-writer'
import { NOSAKI_ID_LIST, getFleetStatus } from './fleet-utils'
import {
  NOSAKI_COND_MAX,
  akashiEstimate,
  nosakiMoraleEstimate,
  timePerHPCalc,
} from './functions'

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

type MoraleWatchStatus =
  | 'boost-ready'
  | 'boosted'
  | 'docking'
  | 'no-nosaki'
  | 'waiting'

interface MoraleWatchShip extends EnhancedShip {
  finalCond: number
  moraleStatus: MoraleWatchStatus
}

interface MoraleQueueProps {
  initialManagingWatchList?: boolean
  initialWatchedShipIds?: number[]
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
      fp.map((ship: APIShip): EnhancedShip => {
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
      }),
    )(ships),
)

const moraleWatchShipsSelector = createSelector(
  [
    (state: RootState) => state.info.fleets,
    (state: RootState) => state.info.ships,
    (state: RootState) => state.const.$ships,
    shipFleetIdMapSelector,
    repairIdSelector,
    (state: RootState) => state.info.equips,
  ],
  (
    fleets,
    ships,
    $ships,
    shipFleetIdMap,
    repairIds,
    equips,
  ): MoraleWatchShip[] => {
    const fleetStatusById = new Map(
      fleets.map((fleet) => {
        const status = getFleetStatus(fleet, ships, $ships, repairIds, equips)
        return [fleet.api_id, status] as const
      }),
    )
    const fleetIdByShipId = new Map(
      fleets.flatMap((fleet) =>
        fleet.api_ship
          .filter((shipId) => shipId > 0)
          .map((shipId) => [shipId, fleet.api_id] as const),
      ),
    )

    return Object.values(ships).flatMap((ship): MoraleWatchShip[] => {
      if (!ship || NOSAKI_ID_LIST.includes(ship.api_ship_id)) return []

      const constShip = $ships[ship.api_ship_id]
      if (!constShip) return []

      const fleetId = fleetIdByShipId.get(ship.api_id)
      const status = fleetId ? fleetStatusById.get(fleetId) : undefined
      const nosakiShipId = status?.nosakiShipId ?? -1
      const moraleEstimate = nosakiMoraleEstimate({
        api_cond: ship.api_cond,
        nosakiShipId,
      })
      const inRepair = includes(repairIds, ship.api_id)
      const finalCond = Math.min(
        NOSAKI_COND_MAX,
        ship.api_cond + moraleEstimate.boostAmount,
      )

      let moraleStatus: MoraleWatchStatus = 'boost-ready'
      if (inRepair) {
        moraleStatus = 'docking'
      } else if (ship.api_cond >= NOSAKI_COND_MAX) {
        moraleStatus = 'boosted'
      } else if (!status?.nosakiPresent || nosakiShipId < 0) {
        moraleStatus = 'no-nosaki'
      } else if (!status.canBoostMorale) {
        moraleStatus = 'waiting'
      }

      return [
        {
          ...constShip,
          ...ship,
          akashi: 0,
          canBoostMorale:
            (status?.canBoostMorale ?? false) && moraleEstimate.canBoost,
          finalCond,
          fleetId: shipFleetIdMap[ship.api_id] ?? -1,
          hpPercentage: ship.api_nowhp / ship.api_maxhp,
          moraleStatus,
          moraleBoostAmount: moraleEstimate.boostAmount,
          perHP: 0,
        },
      ]
    })
  },
)

const getHPBackgroundColor = (nowhp: number, maxhp: number): string => {
  const percentage = nowhp / maxhp
  return percentage > 0.75
    ? chroma
        .mix(Colors.GOLD3, Colors.GREEN3, (percentage - 0.75) / 0.25, 'lab')
        .alpha(0.28)
        .css()
    : chroma
        .mix(Colors.ORANGE3, Colors.GOLD3, (percentage - 0.5) / 0.25, 'lab')
        .alpha(0.28)
        .css()
}

const REPAIR_QUEUE_COLUMNS = `
  minmax(14rem, 2fr) minmax(7rem, 1fr) minmax(8rem, 1fr) minmax(8rem, 1fr)
`

const MORALE_QUEUE_COLUMNS = `
  minmax(14rem, 2fr) minmax(6rem, 0.7fr) minmax(8rem, 1fr) minmax(9rem, 1.2fr)
`

const PLUGIN_KEY = 'poi-plugin-anchorage-repair'
const MORALE_WATCH_STORAGE_KEY = 'moraleWatchList'
const DATA_PATH =
  typeof window.APPDATA_PATH === 'string'
    ? join(window.APPDATA_PATH, `${PLUGIN_KEY}.json`)
    : ''

type PluginData = {
  [MORALE_WATCH_STORAGE_KEY]?: number[]
}

const shipTypeOptions: Array<{ id: number[] | -1; name: string }> = [
  { id: -1, name: 'All' },
  { id: [8, 9, 10, 12], name: 'BB' },
  { id: [7, 11, 18], name: 'CV' },
  { id: [5, 6], name: 'CA' },
  { id: [3, 4, 21], name: 'CL' },
  { id: [2], name: 'DD' },
  { id: [13, 14], name: 'SS' },
  { id: [1], name: 'DE' },
  { id: [15, 16, 17, 19, 20, 22], name: 'Auxiliary' },
]

const normalizeShipIds = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((shipId): shipId is number => Number.isInteger(shipId))
    : []

const loadPluginData = async (): Promise<PluginData> => {
  if (!DATA_PATH) return {}
  try {
    const rawValue = await readFile(DATA_PATH, 'utf8')
    return JSON.parse(rawValue) as PluginData
  } catch {
    return {}
  }
}

const loadWatchedShipIds = async (): Promise<Set<number>> => {
  const data = await loadPluginData()
  return new Set(normalizeShipIds(data[MORALE_WATCH_STORAGE_KEY]))
}

const fileWriter = new FileWriter()

const saveWatchedShipIds = (shipIds: Set<number>) => {
  if (!DATA_PATH) return
  fileWriter.write(DATA_PATH, {
    [MORALE_WATCH_STORAGE_KEY]: [...shipIds],
  } satisfies PluginData)
}

const CandidateListContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`

const ScrollContainer = styled.div`
  flex: 1;
  overflow: auto;
  padding: 0.25rem;

  ::-webkit-scrollbar {
    width: 1em;
  }
`

const StyledTable = styled(HTMLTable)<{ $columns: string }>`
  --repair-table-background: ${Colors.WHITE};
  --repair-table-border: ${Colors.LIGHT_GRAY1};
  --repair-table-header-background: ${Colors.LIGHT_GRAY5};
  --repair-table-header-hover: ${Colors.LIGHT_GRAY4};
  --repair-table-row-border: ${Colors.LIGHT_GRAY3};
  --repair-table-text: ${Colors.DARK_GRAY1};

  width: 100%;
  min-width: 42rem;
  border-collapse: collapse;
  display: block;
  border: 1px solid var(--repair-table-border);
  border-radius: 4px;
  overflow: hidden;
  background: var(--repair-table-background);

  .bp5-dark & {
    --repair-table-background: ${Colors.DARK_GRAY3};
    --repair-table-border: ${Colors.DARK_GRAY5};
    --repair-table-header-background: ${Colors.DARK_GRAY4};
    --repair-table-header-hover: ${Colors.DARK_GRAY5};
    --repair-table-row-border: ${Colors.DARK_GRAY5};
    --repair-table-text: ${Colors.LIGHT_GRAY5};
  }

  thead,
  tbody {
    display: block;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--repair-table-header-background);
    border-bottom: 1px solid var(--repair-table-border);
  }

  thead tr {
    display: grid;
    grid-template-columns: ${(props) => props.$columns};
  }

  && thead th {
    padding: 0.55rem 0.75rem;
    text-align: left;
    cursor: pointer;
    user-select: none;
    font-weight: 600;
    color: var(--repair-table-text);

    &:hover {
      background-color: var(--repair-table-header-hover);
    }
  }

  tbody {
    position: relative;
    width: 100%;
  }

  && tbody td {
    padding: 0.55rem 0.75rem;
    vertical-align: middle;
    position: relative;
    z-index: 1;
    border-bottom: 0;
  }
`

const TableRow = styled.tr<{
  $background: string
  $columns: string
  $percentage: number
}>`
  position: absolute;
  width: 100%;
  display: grid;
  grid-template-columns: ${(props) => props.$columns};
  align-items: center;
  border-bottom: 1px solid var(--repair-table-row-border);
  color: var(--repair-table-text);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    width: ${(props) => props.$percentage}%;
    background: ${(props) => props.$background};
  }

  &:hover::before {
    filter: saturate(1.08);
  }
`

const ShipName = styled.span`
  font-size: 110%;
  font-weight: 500;
`

const SortIndicator = styled.span`
  margin-left: 0.5em;
`

const SelectorPanel = styled.div`
  --ship-selector-background: ${Colors.LIGHT_GRAY5};
  --ship-selector-border: ${Colors.LIGHT_GRAY1};
  --ship-selector-card-background: ${Colors.WHITE};
  --ship-selector-text: ${Colors.DARK_GRAY1};

  border: 1px solid var(--ship-selector-border);
  border-radius: 4px;
  background: var(--ship-selector-background);
  margin: 0.25rem;
  max-height: calc(100vh - 6rem);
  overflow: hidden;
  padding: 0.75rem;

  .bp5-dark & {
    --ship-selector-background: ${Colors.DARK_GRAY3};
    --ship-selector-border: ${Colors.DARK_GRAY5};
    --ship-selector-card-background: ${Colors.DARK_GRAY4};
    --ship-selector-text: ${Colors.LIGHT_GRAY5};
  }
`

const SelectorToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0.25rem 0.75rem;
`

const ManagerToolbar = styled(SelectorToolbar)`
  justify-content: space-between;
`

const SelectorHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  color: var(--ship-selector-text);
  margin-bottom: 0.5rem;
`

const SelectorTitle = styled.div`
  font-weight: 600;
`

const SelectorHint = styled.div`
  font-size: 90%;
  color: ${Colors.GRAY1};
  text-align: right;

  .bp5-dark & {
    color: ${Colors.GRAY5};
  }
`

const SelectorContent = styled.div`
  display: grid;
  grid-template-columns: minmax(16rem, 24rem) minmax(32rem, 1fr);
  align-items: start;
  gap: 1rem;
  min-height: 0;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

const SelectorSection = styled.section`
  align-self: start;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--ship-selector-border);
  border-radius: 4px;
  background: var(--ship-selector-card-background);
  padding: 0.75rem;
`

const SelectorControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const ShipTypeFilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const AvailableSection = styled.div`
  margin-top: 0.75rem;
`

const WatchedList = styled.ul`
  padding: 0;
  margin: 0.5rem 0 0;
  max-height: 14rem;
  overflow-y: auto;
`

const WatchedListItem = styled.li`
  align-items: center;
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr) auto auto;
  gap: 0.5rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--ship-selector-border);

  &:last-child {
    border-bottom: 0;
  }
`

const ShipList = styled.ul`
  padding: 0;
  margin: 0.5rem 0 0;
  max-height: 26rem;
  overflow-y: auto;
`

const ShipListItem = styled.li`
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr) auto auto;
  align-items: center;
  cursor: pointer;
  gap: 0.5rem;
  padding: 0.5em 1em;
  border-bottom: 1px solid var(--ship-selector-border);

  &:hover {
    background: var(--ship-selector-background);
  }

  &:last-child {
    border-bottom: 0;
  }
`

const ShipLv = styled.span`
  width: 4.5em;
`

const SelectorShipName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SelectorShipActions = styled.span`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
`

const SelectorEmpty = styled.div`
  color: ${Colors.GRAY1};
  padding: 0.5rem 0;

  .bp5-dark & {
    color: ${Colors.GRAY5};
  }
`

const ShipCell: React.FC<{ ship: EnhancedShip }> = ({ ship }) => {
  const { t } = useTranslation()

  return (
    <ShipName>
      {`Lv.${ship.api_lv} ${t(ship.api_name, { ns: 'resources' })}${
        ship.fleetId < 0 ? '' : `/${ship.fleetId + 1}`
      }`}
    </ShipName>
  )
}

const ShipSelector: React.FC<{
  ships: MoraleWatchShip[]
  watchedShipIds: Set<number>
  toggleWatch: (shipId: number) => void
}> = ({ ships, watchedShipIds, toggleWatch }) => {
  const { t } = useTranslation(['poi-plugin-anchorage-repair', 'resources'])
  const [query, setQuery] = useState('')
  const [selectedShipType, setSelectedShipType] = useState('All')

  const filteredShipIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return null

    return ships
      .filter((ship) => {
        const translatedName = t(ship.api_name, { ns: 'resources' })
        return `${ship.api_name} ${translatedName} ${ship.api_lv}`
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .map((ship) => ship.api_id)
  }, [query, ships, t])

  const watchedShips = useMemo(
    () => ships.filter((ship) => watchedShipIds.has(ship.api_id)),
    [ships, watchedShipIds],
  )

  const availableShips = useMemo(
    () => ships.filter((ship) => !watchedShipIds.has(ship.api_id)),
    [ships, watchedShipIds],
  )

  const shipTypeCounts = useMemo(
    () =>
      Object.fromEntries(
        shipTypeOptions.map((option) => [
          option.name,
          availableShips.filter(
            (ship) => option.id === -1 || option.id.includes(ship.api_stype),
          ).length,
        ]),
      ),
    [availableShips],
  )

  const selectedShipTypeOption =
    shipTypeOptions.find((option) => option.name === selectedShipType) ??
    shipTypeOptions[0]

  const selectableShips = availableShips
    .filter(
      (ship) =>
        selectedShipTypeOption.id === -1 ||
        selectedShipTypeOption.id.includes(ship.api_stype),
    )
    .filter((ship) => !filteredShipIds || filteredShipIds.includes(ship.api_id))

  const renderShipList = () => (
    <ShipList>
      {selectableShips.length > 0 ? (
        selectableShips.map((ship) => (
          <ShipListItem key={ship.api_id}>
            <ShipLv>{`Lv.${String(ship.api_lv).padEnd(4)}`}</ShipLv>
            <SelectorShipName>
              {t(ship.api_name, { ns: 'resources' })}
            </SelectorShipName>
            <SelectorShipActions>
              <Tag>{ship.api_cond}</Tag>
              <Button
                intent="primary"
                small
                minimal
                onClick={() => toggleWatch(ship.api_id)}
              >
                {t('Watch')}
              </Button>
            </SelectorShipActions>
          </ShipListItem>
        ))
      ) : (
        <SelectorEmpty>{t('No ships available')}</SelectorEmpty>
      )}
    </ShipList>
  )

  return (
    <SelectorPanel>
      <SelectorHeader>
        <SelectorTitle>{t('Manage watch list')}</SelectorTitle>
        <SelectorHint>{t('Select ships to watch')}</SelectorHint>
      </SelectorHeader>
      <SelectorContent>
        <SelectorSection>
          <SelectorHeader>
            <SelectorTitle>{t('Watched')}</SelectorTitle>
            <SelectorHint>
              {t('Watched ships count', { count: watchedShips.length })}
            </SelectorHint>
          </SelectorHeader>
          {watchedShips.length > 0 ? (
            <WatchedList>
              {watchedShips.map((ship) => (
                <WatchedListItem key={ship.api_id}>
                  <ShipLv>{`Lv.${String(ship.api_lv).padEnd(4)}`}</ShipLv>
                  <SelectorShipName>
                    {t(ship.api_name, { ns: 'resources' })}
                  </SelectorShipName>
                  <SelectorShipActions>
                    <Tag>{ship.api_cond}</Tag>
                    <Button
                      intent="danger"
                      small
                      minimal
                      onClick={() => toggleWatch(ship.api_id)}
                    >
                      {t('Remove')}
                    </Button>
                  </SelectorShipActions>
                </WatchedListItem>
              ))}
            </WatchedList>
          ) : (
            <SelectorEmpty>{t('No watched ships')}</SelectorEmpty>
          )}
        </SelectorSection>
        <SelectorSection>
          <SelectorControls>
            <InputGroup
              fill
              placeholder={t('Search ships')}
              rightElement={
                query ? (
                  <Button minimal small onClick={() => setQuery('')}>
                    {t('Clear')}
                  </Button>
                ) : undefined
              }
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <ShipTypeFilterBar>
              {shipTypeOptions.map((option) => (
                <Button
                  key={option.name}
                  active={option.name === selectedShipType}
                  small
                  onClick={() => setSelectedShipType(option.name)}
                >
                  {`${t(option.name)} (${shipTypeCounts[option.name] ?? 0})`}
                </Button>
              ))}
            </ShipTypeFilterBar>
          </SelectorControls>
          <AvailableSection>
            <SelectorHeader>
              <SelectorTitle>
                {t('Available ships count', { count: selectableShips.length })}
              </SelectorTitle>
              <SelectorHint>{t(selectedShipTypeOption.name)}</SelectorHint>
            </SelectorHeader>
            {renderShipList()}
          </AvailableSection>
        </SelectorSection>
      </SelectorContent>
    </SelectorPanel>
  )
}

const WatchListManager: React.FC<{
  ships: MoraleWatchShip[]
  watchedShipIds: Set<number>
  toggleWatch: (shipId: number) => void
}> = ({ ships, watchedShipIds, toggleWatch }) => (
  <ShipSelector
    ships={ships}
    watchedShipIds={watchedShipIds}
    toggleWatch={toggleWatch}
  />
)

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
          return <ShipCell ship={ship} />
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
        <StyledTable $columns={REPAIR_QUEUE_COLUMNS}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
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
                  $columns={REPAIR_QUEUE_COLUMNS}
                  $percentage={percentage}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
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

const getMoraleStatusIntent = (status: MoraleWatchStatus) => {
  switch (status) {
    case 'boost-ready':
      return 'primary'
    case 'boosted':
      return 'success'
    case 'docking':
    case 'waiting':
      return 'warning'
    case 'no-nosaki':
    default:
      return 'none'
  }
}

const getMoraleStatusLabel = (
  status: MoraleWatchStatus,
  t: (key: string) => string,
) => {
  switch (status) {
    case 'boost-ready':
      return t('Boost ready')
    case 'boosted':
      return t('Boosted')
    case 'docking':
      return t('Docking')
    case 'waiting':
      return t('Waiting for Nosaki')
    case 'no-nosaki':
    default:
      return t('No Nosaki')
  }
}

export const MoraleQueue: React.FC<MoraleQueueProps> = ({
  initialManagingWatchList = false,
  initialWatchedShipIds,
}) => {
  const ships = useSelector(moraleWatchShipsSelector)
  const { t } = useTranslation('poi-plugin-anchorage-repair')
  const [sorting, setSorting] = useState<SortingState>([])
  const [isManagingWatchList, setIsManagingWatchList] = useState(
    initialManagingWatchList,
  )
  const [watchedShipIds, setWatchedShipIds] = useState(
    () => new Set(initialWatchedShipIds),
  )
  const watchListChangedBeforeLoadRef = useRef(false)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsManagingWatchList(initialManagingWatchList)
  }, [initialManagingWatchList])

  useEffect(() => {
    if (initialWatchedShipIds) {
      setWatchedShipIds(new Set(initialWatchedShipIds))
      return
    }

    let cancelled = false
    loadWatchedShipIds().then((shipIds) => {
      if (!cancelled && !watchListChangedBeforeLoadRef.current) {
        setWatchedShipIds(shipIds)
      }
    })

    return () => {
      cancelled = true
    }
  }, [initialWatchedShipIds])

  const toggleWatch = useCallback(
    (shipId: number) => {
      setWatchedShipIds((currentShipIds) => {
        watchListChangedBeforeLoadRef.current = true
        const nextShipIds = new Set(currentShipIds)
        if (nextShipIds.has(shipId)) {
          nextShipIds.delete(shipId)
        } else {
          nextShipIds.add(shipId)
        }
        if (!initialWatchedShipIds) {
          saveWatchedShipIds(nextShipIds)
        }
        return nextShipIds
      })
    },
    [initialWatchedShipIds],
  )

  const visibleShips = useMemo(
    () =>
      ships.filter(
        (ship) =>
          watchedShipIds.has(ship.api_id) ||
          (ship.moraleStatus !== 'no-nosaki' && ship.moraleBoostAmount > 0),
      ),
    [ships, watchedShipIds],
  )

  const selectableShips = useMemo(
    () =>
      [...ships].sort((shipA, shipB) => {
        const fleetSortA =
          shipA.fleetId >= 0 ? shipA.fleetId : Number.MAX_SAFE_INTEGER
        const fleetSortB =
          shipB.fleetId >= 0 ? shipB.fleetId : Number.MAX_SAFE_INTEGER
        if (fleetSortA !== fleetSortB) return fleetSortA - fleetSortB
        return shipB.api_lv - shipA.api_lv || shipB.api_id - shipA.api_id
      }),
    [ships],
  )

  const columns = useMemo<ColumnDef<MoraleWatchShip>[]>(
    () => [
      {
        id: 'ship',
        header: t('Ship'),
        cell: (info) => <ShipCell ship={info.row.original} />,
        enableSorting: false,
      },
      {
        accessorKey: 'api_cond',
        header: t('Cond'),
        cell: (info) => info.row.original.api_cond,
        sortingFn: (rowA, rowB) =>
          rowA.original.api_cond - rowB.original.api_cond,
      },
      {
        accessorKey: 'moraleBoostAmount',
        header: t('Morale Boost'),
        cell: (info) => {
          const ship = info.row.original
          return ship.moraleBoostAmount > 0
            ? `+${ship.moraleBoostAmount} (${ship.finalCond})`
            : '-'
        },
        sortingFn: (rowA, rowB) =>
          rowA.original.moraleBoostAmount - rowB.original.moraleBoostAmount,
      },
      {
        accessorKey: 'moraleStatus',
        header: t('Status'),
        cell: (info) => {
          const status = info.row.original.moraleStatus
          return (
            <Tag intent={getMoraleStatusIntent(status)}>
              {getMoraleStatusLabel(status, t)}
            </Tag>
          )
        },
      },
    ],
    [t],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: visibleShips,
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

  if (isManagingWatchList) {
    return (
      <CandidateListContainer id="morale-candidate-list">
        <ManagerToolbar>
          <Button onClick={() => setIsManagingWatchList(false)}>
            {t('Back to morale queue')}
          </Button>
        </ManagerToolbar>
        <WatchListManager
          ships={selectableShips}
          watchedShipIds={watchedShipIds}
          toggleWatch={toggleWatch}
        />
      </CandidateListContainer>
    )
  }

  return (
    <CandidateListContainer id="morale-candidate-list">
      <SelectorToolbar>
        <Button intent="primary" onClick={() => setIsManagingWatchList(true)}>
          {t('Manage watch list')}
        </Button>
      </SelectorToolbar>
      <ScrollContainer ref={tableContainerRef}>
        <StyledTable $columns={MORALE_QUEUE_COLUMNS}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
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
              return (
                <TableRow
                  key={row.id}
                  $background="transparent"
                  $columns={MORALE_QUEUE_COLUMNS}
                  $percentage={0}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
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
