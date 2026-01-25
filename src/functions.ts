import FACTOR from './factor'

export const AKASHI_INTERVAL = 20 * 60 * 1000 // minimum time required, in ms
const DOCKING_OFFSET = 30 * 1000 // offset in docking time formula
const MINOR_PERCENT = 0.5 // minor damage determination

const minuteCeil = (time: number) => {
  const minute = 60 * 1000

  return Math.ceil(time / minute) * minute
}

// estimate the time needed in anchorage repair
export const akashiEstimate = ({
  api_nowhp,
  api_maxhp,
  api_ndock_time,
}: {
  api_nowhp: number
  api_maxhp: number
  api_ndock_time: number
}) => {
  if (api_ndock_time === 0 || api_nowhp >= api_maxhp) return 0

  if (api_nowhp <= api_maxhp * MINOR_PERCENT) return 0 // damage check

  if (api_maxhp - api_nowhp === 1) return AKASHI_INTERVAL // if only 1 hp to repair

  return Math.max(minuteCeil(api_ndock_time - DOCKING_OFFSET), AKASHI_INTERVAL)
}

export const timePerHPCalc = ({
  api_nowhp,
  api_maxhp,
  api_ndock_time,
}: {
  api_nowhp: number
  api_maxhp: number
  api_ndock_time: number
}) =>
  api_nowhp < api_maxhp && api_nowhp >= api_maxhp * MINOR_PERCENT
    ? (api_ndock_time - DOCKING_OFFSET) / (api_maxhp - api_nowhp)
    : 0

// alternative way for timePerHP
export const getTimePerHP = (api_lv = 1, api_stype = 1) => {
  let factor = 0
  if (FACTOR[api_stype] != null) factor = FACTOR[api_stype].factor || 0

  if (factor === 0) return 0

  if (api_lv < 12) {
    return api_lv * 10 * factor * 1000
  }

  return (
    (api_lv * 5 + (Math.floor(Math.sqrt(api_lv - 11)) * 10 + 50)) *
    factor *
    1000
  )
}

export const repairEstimate = (
  {
    api_nowhp,
    api_maxhp,
    timePerHP,
  }: {
    api_nowhp: number
    api_maxhp: number
    timePerHP: number
  },
  timeElapsed = 0,
  availableSRF = false,
) => {
  // timeElapsed is in seconds
  if (api_nowhp >= api_maxhp || timePerHP === 0 || !availableSRF) return 0

  if (timeElapsed * 1000 < AKASHI_INTERVAL) {
    return 0
  }

  return Math.min(
    Math.max(Math.floor((timeElapsed * 1000) / timePerHP), 1),
    api_maxhp - api_nowhp,
  )
}

export const getHPLabelStyle = (
  nowhp: number,
  maxhp: number,
  availableSRF: boolean = true,
  inRepair: boolean = false,
) => {
  const percentage = nowhp / maxhp
  if (!availableSRF) {
    return 'warning'
  }
  switch (true) {
    case percentage >= 1 || inRepair:
      return 'success'
    case percentage >= MINOR_PERCENT:
      return 'primary'
    case percentage < MINOR_PERCENT:
      return 'warning'
    default:
      return 'warning'
  }
}

export const getCountdownLabelStyle = (
  props: unknown,
  timeRemaining: number,
): string => {
  switch (true) {
    case timeRemaining > 600:
      return 'primary'
    case timeRemaining > 60:
      return 'warning'
    case timeRemaining >= 0:
      return 'success'
    default:
      return 'default'
  }
}
