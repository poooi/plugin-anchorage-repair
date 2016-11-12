export const AKASHI_INTERVAL = 20 * 60 * 1000 // minimum time required, in ms
const DOCKING_OFFSET = 30 * 1000 // offset in docking time formula
const MINOR_PERCENT = 0.5 // minor damage determination

const minuteCeil = (time) => {
  const minute = 60 * 1000

  return Math.ceil(time/minute) * minute
}

// estimate the time needed in anchorage repair
export const akashiEstimate = ({api_nowhp, api_maxhp, api_ndock_time}) => {

  if (api_ndock_time === 0 || api_nowhp >= api_maxhp) return 0

  if (api_nowhp < api_maxhp * MINOR_PERCENT) return 0 // damage check

  if (api_maxhp - api_nowhp == 1) return AKASHI_INTERVAL // if only 1 hp to repair

  return Math.max(minuteCeil(api_ndock_time - DOCKING_OFFSET), AKASHI_INTERVAL)
}

export const timePerHPCalc = ({api_nowhp, api_maxhp, api_ndock_time}) => {
  return (api_nowhp < api_maxhp && api_nowhp >= api_maxhp * MINOR_PERCENT) ?
    ((api_ndock_time - DOCKING_OFFSET) / (api_maxhp - api_nowhp)) :
    0
}

export const repairEstimate = ({api_nowhp, api_maxhp, timePerHP}, timeElapsed = 0, availableSRF = false) => {
  // timeElapsed is in seconds
  if (api_nowhp >= api_maxhp || timePerHP == 0 || !availableSRF) return 0

  if (timeElapsed * 1000 < AKASHI_INTERVAL) {
    return 0
  }
  else {
    return Math.min(Math.max(Math.floor(timeElapsed * 1000 / timePerHP), 1), api_maxhp - api_nowhp)
  }
}

export const getHPLabelStyle = (nowhp, maxhp, availableSRF = true) => {
  let percentage = nowhp / maxhp
  if (!availableSRF) return 'warning'
  switch(true){
  case (percentage == 1):
    return 'success'
  case (percentage >= MINOR_PERCENT):
    return 'primary'
  case (percentage < MINOR_PERCENT):
    return 'warning'
  }
}

export const getCountdownLabelStyle = (props, timeRemaining) => {
  return (
    timeRemaining > 600 ? 'primary' :
    timeRemaining > 60 ? 'warning' :
    timeRemaining >= 0 ? 'success' :
    'default'
  )
}
