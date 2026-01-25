import { describe, it, expect } from 'vitest'
import {
  AKASHI_INTERVAL,
  NOSAKI_INTERVAL,
  PAIRED_REPAIR_TIME_MULTIPLIER,
  MODERATE_DAMAGE_THRESHOLD,
  BELOW_MINOR_PERCENT,
  NOSAKI_COND_MAX,
  NOSAKI_ID,
  NOSAKI_KAI_ID,
  akashiEstimate,
  timePerHPCalc,
  getTimePerHP,
  repairEstimate,
  getHPLabelStyle,
  getCountdownLabelStyle,
  nosakiMoraleEstimate,
} from '../functions'

describe('functions.ts', () => {
  describe('Constants', () => {
    it('should export AKASHI_INTERVAL as 20 minutes in ms', () => {
      expect(AKASHI_INTERVAL).toBe(20 * 60 * 1000)
    })

    it('should export NOSAKI_INTERVAL as 15 minutes in ms', () => {
      expect(NOSAKI_INTERVAL).toBe(15 * 60 * 1000)
    })

    it('should export PAIRED_REPAIR_TIME_MULTIPLIER as 0.85', () => {
      expect(PAIRED_REPAIR_TIME_MULTIPLIER).toBe(0.85)
    })

    it('should export MODERATE_DAMAGE_THRESHOLD as 0.5', () => {
      expect(MODERATE_DAMAGE_THRESHOLD).toBe(0.5)
    })

    it('should export BELOW_MINOR_PERCENT as 0.75', () => {
      expect(BELOW_MINOR_PERCENT).toBe(0.75)
    })

    it('should export NOSAKI_COND_MAX as 54', () => {
      expect(NOSAKI_COND_MAX).toBe(54)
    })

    it('should export NOSAKI_ID as 996', () => {
      expect(NOSAKI_ID).toBe(996)
    })

    it('should export NOSAKI_KAI_ID as 1002', () => {
      expect(NOSAKI_KAI_ID).toBe(1002)
    })
  })

  describe('akashiEstimate', () => {
    it('should return 0 when api_ndock_time is 0', () => {
      expect(
        akashiEstimate({
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 0,
        }),
      ).toBe(0)
    })

    it('should return 0 when ship is at full HP', () => {
      expect(
        akashiEstimate({
          api_nowhp: 40,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(0)
    })

    it('should return 0 when ship is moderately damaged (HP <= 50%)', () => {
      expect(
        akashiEstimate({
          api_nowhp: 20,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(0)
    })

    it('should return 0 when ship is heavily damaged (HP < 50%)', () => {
      expect(
        akashiEstimate({
          api_nowhp: 10,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(0)
    })

    it('should return AKASHI_INTERVAL when only 1 HP to repair', () => {
      expect(
        akashiEstimate({
          api_nowhp: 39,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(AKASHI_INTERVAL)
    })

    it('should calculate repair time correctly for normal damage', () => {
      // Ship with 35/40 HP (above 50% threshold)
      // ndock_time = 5 * 60 * 1000 + 30 * 1000 = 330000ms (5.5 min)
      // After offset: 330000 - 30000 = 300000ms (5 min)
      // Ceil to minute: 300000ms (5 min)
      // Max with AKASHI_INTERVAL: max(300000, 1200000) = 1200000
      expect(
        akashiEstimate({
          api_nowhp: 35,
          api_maxhp: 40,
          api_ndock_time: 330000,
        }),
      ).toBe(AKASHI_INTERVAL)
    })

    it('should round up to next minute', () => {
      // Ship with long repair time
      // ndock_time = 25 * 60 * 1000 + 30 * 1000 = 1530000ms
      // After offset: 1530000 - 30000 = 1500000ms (25 min)
      // Ceil to minute: 1500000ms (25 min)
      expect(
        akashiEstimate({
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 1530000,
        }),
      ).toBe(1500000)
    })

    it('should ceil up partial minutes', () => {
      // ndock_time = 25 * 60 * 1000 + 30 * 1000 + 1000 = 1531000ms
      // After offset: 1531000 - 30000 = 1501000ms (25 min 1 sec)
      // Ceil to minute: 1560000ms (26 min)
      expect(
        akashiEstimate({
          api_nowhp: 30,
          api_maxhp: 40,
          api_ndock_time: 1531000,
        }),
      ).toBe(1560000)
    })
  })

  describe('timePerHPCalc', () => {
    it('should return 0 when ship is at full HP', () => {
      expect(
        timePerHPCalc({
          api_nowhp: 40,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(0)
    })

    it('should return 0 when ship is heavily damaged (HP < 50%)', () => {
      // 19/40 = 47.5%, below threshold
      expect(
        timePerHPCalc({
          api_nowhp: 19,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(0)
    })

    it('should calculate time per HP correctly', () => {
      // Ship with 35/40 HP (5 HP to repair)
      // ndock_time = 330000ms, offset = 30000ms
      // timePerHP = (330000 - 30000) / 5 = 60000ms
      expect(
        timePerHPCalc({
          api_nowhp: 35,
          api_maxhp: 40,
          api_ndock_time: 330000,
        }),
      ).toBe(60000)
    })

    it('should calculate time per HP at exactly 50% HP', () => {
      // Exactly 50%: 20/40 = 50%, at threshold boundary
      // HP to repair: 40 - 20 = 20
      // timePerHP = (100000 - 30000) / 20 = 3500
      expect(
        timePerHPCalc({
          api_nowhp: 20,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBe(3500)
    })

    it('should handle case just above 50% HP', () => {
      // Just above 50%: 21/40 = 52.5%
      // HP to repair: 40 - 21 = 19
      // timePerHP = (100000 - 30000) / 19 ≈ 3684.21
      expect(
        timePerHPCalc({
          api_nowhp: 21,
          api_maxhp: 40,
          api_ndock_time: 100000,
        }),
      ).toBeCloseTo(3684.21, 1)
    })
  })

  describe('getTimePerHP', () => {
    it('should return 0 for unknown ship type', () => {
      expect(getTimePerHP(10, 999)).toBe(0)
    })

    it('should return 0 for super dreadnought (factor 0)', () => {
      expect(getTimePerHP(10, 12)).toBe(0)
    })

    it('should calculate correctly for level < 12', () => {
      // Level 5, destroyer (factor 1)
      // timePerHP = 5 * 10 * 1 * 1000 = 50000ms
      expect(getTimePerHP(5, 2)).toBe(50000)
    })

    it('should calculate correctly for level 12 (formula transition)', () => {
      // Level 12, destroyer (factor 1)
      // timePerHP = (12 * 5 + (floor(sqrt(12-11)) * 10 + 50)) * 1 * 1000
      // = (60 + (1 * 10 + 50)) * 1000 = (60 + 60) * 1000 = 120000ms
      expect(getTimePerHP(12, 2)).toBe(120000)
    })

    it('should calculate correctly for level > 12', () => {
      // Level 50, destroyer (factor 1)
      // sqrt(50-11) = sqrt(39) ≈ 6.24, floor = 6
      // timePerHP = (50 * 5 + (6 * 10 + 50)) * 1 * 1000
      // = (250 + 110) * 1000 = 360000ms
      expect(getTimePerHP(50, 2)).toBe(360000)
    })

    it('should apply factor 0.5 for escort ships', () => {
      // Level 5, escort ship (factor 0.5)
      // timePerHP = 5 * 10 * 0.5 * 1000 = 25000ms
      expect(getTimePerHP(5, 1)).toBe(25000)
    })

    it('should apply factor 2 for carriers', () => {
      // Level 5, carrier (factor 2)
      // timePerHP = 5 * 10 * 2 * 1000 = 100000ms
      expect(getTimePerHP(5, 11)).toBe(100000)
    })

    it('should apply factor 1.5 for heavy cruisers', () => {
      // Level 5, heavy cruiser (factor 1.5)
      // timePerHP = 5 * 10 * 1.5 * 1000 = 75000ms
      expect(getTimePerHP(5, 5)).toBe(75000)
    })

    it('should use default values when parameters are omitted', () => {
      // Default: level 1, stype 1 (escort, factor 0.5)
      // timePerHP = 1 * 10 * 0.5 * 1000 = 5000ms
      expect(getTimePerHP()).toBe(5000)
    })

    it('should calculate correctly for high level ships', () => {
      // Level 100, destroyer (factor 1)
      // sqrt(100-11) = sqrt(89) ≈ 9.43, floor = 9
      // timePerHP = (100 * 5 + (9 * 10 + 50)) * 1 * 1000
      // = (500 + 140) * 1000 = 640000ms
      expect(getTimePerHP(100, 2)).toBe(640000)
    })
  })

  describe('repairEstimate', () => {
    it('should return 0 when ship is at full HP', () => {
      expect(
        repairEstimate(
          {
            api_nowhp: 40,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1300,
          true,
        ),
      ).toBe(0)
    })

    it('should return 0 when timePerHP is 0', () => {
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 0,
          },
          1300,
          true,
        ),
      ).toBe(0)
    })

    it('should return 0 when availableSRF is false', () => {
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1300,
          false,
        ),
      ).toBe(0)
    })

    it('should return 0 when ship is moderately damaged (HP <= 50%)', () => {
      expect(
        repairEstimate(
          {
            api_nowhp: 20,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1300,
          true,
        ),
      ).toBe(0)
    })

    it('should return 0 when timeElapsed is less than AKASHI_INTERVAL', () => {
      // 20 minutes = 1200 seconds
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1199,
          true,
        ),
      ).toBe(0)
    })

    it('should calculate repaired HP correctly', () => {
      // timeElapsed = 1500 seconds = 1500000ms
      // timePerHP = 60000ms
      // repaired = floor(1500000 / 60000) = 25, but capped at maxhp - nowhp = 10
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1500,
          true,
        ),
      ).toBe(10)
    })

    it('should return at least 1 HP when time is sufficient', () => {
      // timeElapsed = 1200 seconds = 1200000ms
      // timePerHP = 60000ms
      // repaired = floor(1200000 / 60000) = 20, but max(20, 1) = 20
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          1200,
          true,
        ),
      ).toBe(10)
    })

    it('should not exceed HP to repair', () => {
      // timeElapsed = 5000 seconds = 5000000ms
      // timePerHP = 60000ms
      // repaired = floor(5000000 / 60000) = 83, but capped at 10
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          5000,
          true,
        ),
      ).toBe(10)
    })

    it('should default timeElapsed to 0', () => {
      expect(
        repairEstimate(
          {
            api_nowhp: 30,
            api_maxhp: 40,
            timePerHP: 60000,
          },
          undefined,
          true,
        ),
      ).toBe(0)
    })

    it('should default availableSRF to false', () => {
      expect(
        repairEstimate({
          api_nowhp: 30,
          api_maxhp: 40,
          timePerHP: 60000,
        }),
      ).toBe(0)
    })
  })

  describe('getHPLabelStyle', () => {
    it('should return "warning" when availableSRF is false', () => {
      expect(getHPLabelStyle(30, 40, false, false)).toBe('warning')
    })

    it('should return "success" when at full HP', () => {
      expect(getHPLabelStyle(40, 40, true, false)).toBe('success')
    })

    it('should return "success" when inRepair is true', () => {
      expect(getHPLabelStyle(20, 40, true, true)).toBe('success')
    })

    it('should return "primary" when HP >= 50% (minor damage or better)', () => {
      expect(getHPLabelStyle(21, 40, true, false)).toBe('primary')
    })

    it('should return "warning" when HP < 50% (moderate damage)', () => {
      expect(getHPLabelStyle(19, 40, true, false)).toBe('warning')
    })

    it('should return "primary" at exactly 50% HP', () => {
      expect(getHPLabelStyle(20, 40, true, false)).toBe('primary')
    })

    it('should use default values for availableSRF and inRepair', () => {
      // Default: availableSRF = true, inRepair = false
      // HP at 75% = primary
      expect(getHPLabelStyle(30, 40)).toBe('primary')
    })
  })

  describe('getCountdownLabelStyle', () => {
    it('should return "primary" when timeRemaining > 600', () => {
      expect(getCountdownLabelStyle(null, 601)).toBe('primary')
    })

    it('should return "warning" when timeRemaining > 60 and <= 600', () => {
      expect(getCountdownLabelStyle(null, 600)).toBe('warning')
      expect(getCountdownLabelStyle(null, 61)).toBe('warning')
    })

    it('should return "success" when timeRemaining >= 0 and <= 60', () => {
      expect(getCountdownLabelStyle(null, 60)).toBe('success')
      expect(getCountdownLabelStyle(null, 0)).toBe('success')
    })

    it('should return "default" when timeRemaining < 0', () => {
      expect(getCountdownLabelStyle(null, -1)).toBe('default')
    })

    it('should ignore props parameter', () => {
      expect(getCountdownLabelStyle({ anything: 'here' }, 100)).toBe('warning')
    })
  })

  describe('nosakiMoraleEstimate', () => {
    it('should return canBoost: false for invalid Nosaki ship ID', () => {
      const result = nosakiMoraleEstimate({
        api_cond: 40,
        nosakiShipId: 123,
      })
      expect(result.canBoost).toBe(false)
      expect(result.boostAmount).toBe(0)
    })

    it('should return canBoost: false when api_cond >= NOSAKI_COND_MAX', () => {
      const result = nosakiMoraleEstimate({
        api_cond: 54,
        nosakiShipId: NOSAKI_ID,
      })
      expect(result.canBoost).toBe(false)
      expect(result.boostAmount).toBe(0)
    })

    it('should return boost amount 2 for Nosaki (996)', () => {
      const result = nosakiMoraleEstimate({
        api_cond: 40,
        nosakiShipId: NOSAKI_ID,
      })
      expect(result.canBoost).toBe(true)
      expect(result.boostAmount).toBe(2)
    })

    it('should return boost amount 3 for Nosaki Kai (1002)', () => {
      const result = nosakiMoraleEstimate({
        api_cond: 40,
        nosakiShipId: NOSAKI_KAI_ID,
      })
      expect(result.canBoost).toBe(true)
      expect(result.boostAmount).toBe(3)
    })

    it('should cap boost amount at NOSAKI_COND_MAX - api_cond', () => {
      // api_cond = 53, max = 54, so only 1 boost possible
      const result = nosakiMoraleEstimate({
        api_cond: 53,
        nosakiShipId: NOSAKI_ID,
      })
      expect(result.canBoost).toBe(true)
      expect(result.boostAmount).toBe(1)
    })

    it('should cap Nosaki Kai boost at NOSAKI_COND_MAX - api_cond', () => {
      // api_cond = 52, max = 54, Nosaki Kai gives 3 but capped at 2
      const result = nosakiMoraleEstimate({
        api_cond: 52,
        nosakiShipId: NOSAKI_KAI_ID,
      })
      expect(result.canBoost).toBe(true)
      expect(result.boostAmount).toBe(2)
    })

    it('should handle low cond values', () => {
      const result = nosakiMoraleEstimate({
        api_cond: 0,
        nosakiShipId: NOSAKI_KAI_ID,
      })
      expect(result.canBoost).toBe(true)
      expect(result.boostAmount).toBe(3)
    })
  })
})
