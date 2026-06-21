import { describe, expect, it } from 'vitest'

import {
  AKASHI_INTERVAL,
  akashiEstimate,
  PAIRED_REPAIR_TIME_MULTIPLIER,
} from './functions'

describe('akashiEstimate', () => {
  it('applies the paired repair 5/6 time multiplier to total repair time', () => {
    const ship = {
      api_maxhp: 31,
      api_ndock_time: 30 * 60 * 1000,
      api_nowhp: 25,
    }

    expect(PAIRED_REPAIR_TIME_MULTIPLIER).toBe(5 / 6)
    expect(akashiEstimate(ship)).toBe(30 * 60 * 1000)
    expect(akashiEstimate(ship, PAIRED_REPAIR_TIME_MULTIPLIER)).toBe(
      25 * 60 * 1000,
    )
  })

  it('keeps the 20 minute minimum for paired repair', () => {
    const ship = {
      api_maxhp: 31,
      api_ndock_time: 21 * 60 * 1000,
      api_nowhp: 25,
    }

    expect(akashiEstimate(ship, PAIRED_REPAIR_TIME_MULTIPLIER)).toBe(
      AKASHI_INTERVAL,
    )
  })
})
