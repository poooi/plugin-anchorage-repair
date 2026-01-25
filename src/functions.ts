import FACTOR from './factor'

export const AKASHI_INTERVAL = 20 * 60 * 1000 // minimum time required, in ms
export const NOSAKI_INTERVAL = 15 * 60 * 1000 // nosaki morale boost interval, in ms
export const PAIRED_REPAIR_TIME_MULTIPLIER = 0.85 // 15% faster repair when paired (85% of normal time)
const DOCKING_OFFSET = 30 * 1000 // offset in docking time formula
// Damage thresholds per WIKI:
// - HP > 50%: 小破 (minor damage) or better - can be repaired
// - HP ≤ 50%: 中破 (moderate damage) or worse - cannot be repaired
export const MODERATE_DAMAGE_THRESHOLD = 0.5 // HP > 50% required (not 中破 or worse)
export const BELOW_MINOR_PERCENT = 0.75 // below minor damage: HP > 75% (小破未満)
export const NOSAKI_COND_MAX = 54 // maximum cond value for morale boost
export const NOSAKI_ID = 996 // Nosaki ship ID
export const NOSAKI_KAI_ID = 1002 // Nosaki Kai ship ID

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

  if (api_nowhp <= api_maxhp * MODERATE_DAMAGE_THRESHOLD) return 0 // damage check

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
  api_nowhp < api_maxhp && api_nowhp >= api_maxhp * MODERATE_DAMAGE_THRESHOLD
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
  // WIKI: Only ships at minor damage or better (HP > 50%) can be repaired
  if (api_nowhp >= api_maxhp || timePerHP === 0 || !availableSRF) return 0
  
  // Check damage threshold: cannot repair moderate damage (中破) or worse
  if (api_nowhp <= api_maxhp * MODERATE_DAMAGE_THRESHOLD) return 0

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
    case percentage >= MODERATE_DAMAGE_THRESHOLD:
      return 'primary'
    case percentage < MODERATE_DAMAGE_THRESHOLD:
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

/**
 * Calculate morale boost potential for a ship when Nosaki is active
 * Note: This function only checks if the ship can receive morale boost based on cond level.
 * Other requirements (Nosaki's HP, supply status, etc.) are validated in getFleetStatus.
 * Fuel consumption: 1 fuel per ship boosted from fleet resources (not from Nosaki's fuel).
 * 
 * @param api_cond - Current morale/condition value of the ship
 * @param nosakiShipId - ID of the Nosaki ship (996 or 1002) to determine boost amount
 * @returns Object with canBoost flag and boostAmount value
 */
export const nosakiMoraleEstimate = ({
  api_cond,
  nosakiShipId,
}: {
  api_cond: number
  nosakiShipId: number
}): { canBoost: boolean; boostAmount: number } => {
  // Validate Nosaki ship ID
  if (nosakiShipId !== NOSAKI_ID && nosakiShipId !== NOSAKI_KAI_ID) {
    return { canBoost: false, boostAmount: 0 }
  }

  // Check if ship can receive morale boost based on current cond
  if (api_cond >= NOSAKI_COND_MAX) {
    return { canBoost: false, boostAmount: 0 }
  }

  // Boost amount depends on Nosaki or Nosaki Kai
  const boostAmount = nosakiShipId === NOSAKI_KAI_ID ? 3 : 2

  return {
    canBoost: true,
    boostAmount: Math.min(boostAmount, NOSAKI_COND_MAX - api_cond),
  }
}
