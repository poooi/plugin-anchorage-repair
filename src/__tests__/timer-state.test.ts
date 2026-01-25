import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timerState } from '../timer-state'

describe('timer-state.ts', () => {
  beforeEach(() => {
    // Reset timer state before each test
    timerState.clearNosakiTimer()
    timerState.clearRepairTimer()
  })

  describe('TimerStateManager', () => {
    describe('Nosaki timer', () => {
      it('should initially return 0 for lastNosakiRefresh', () => {
        expect(timerState.getLastNosakiRefresh()).toBe(0)
      })

      it('should set and get lastNosakiRefresh', () => {
        const timestamp = 1000000
        timerState.setLastNosakiRefresh(timestamp)
        expect(timerState.getLastNosakiRefresh()).toBe(timestamp)
      })

      it('should reset Nosaki timer to current time', () => {
        const now = Date.now()
        vi.spyOn(Date, 'now').mockReturnValue(now)

        timerState.resetNosakiTimer()
        expect(timerState.getLastNosakiRefresh()).toBe(now)

        vi.restoreAllMocks()
      })

      it('should clear Nosaki timer to 0', () => {
        timerState.setLastNosakiRefresh(1000000)
        timerState.clearNosakiTimer()
        expect(timerState.getLastNosakiRefresh()).toBe(0)
      })
    })

    describe('Repair timer', () => {
      it('should initially return 0 for lastRepairRefresh', () => {
        expect(timerState.getLastRepairRefresh()).toBe(0)
      })

      it('should set and get lastRepairRefresh', () => {
        const timestamp = 2000000
        timerState.setLastRepairRefresh(timestamp)
        expect(timerState.getLastRepairRefresh()).toBe(timestamp)
      })

      it('should reset Repair timer to current time', () => {
        const now = Date.now()
        vi.spyOn(Date, 'now').mockReturnValue(now)

        timerState.resetRepairTimer()
        expect(timerState.getLastRepairRefresh()).toBe(now)

        vi.restoreAllMocks()
      })

      it('should clear Repair timer to 0', () => {
        timerState.setLastRepairRefresh(2000000)
        timerState.clearRepairTimer()
        expect(timerState.getLastRepairRefresh()).toBe(0)
      })
    })

    describe('Subscription', () => {
      it('should notify listeners when Nosaki timer is set', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.setLastNosakiRefresh(1000000)
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should notify listeners when Nosaki timer is reset', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.resetNosakiTimer()
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should notify listeners when Nosaki timer is cleared', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.clearNosakiTimer()
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should notify listeners when Repair timer is set', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.setLastRepairRefresh(2000000)
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should notify listeners when Repair timer is reset', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.resetRepairTimer()
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should notify listeners when Repair timer is cleared', () => {
        const listener = vi.fn()
        timerState.subscribe(listener)

        timerState.clearRepairTimer()
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', () => {
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        timerState.subscribe(listener1)
        timerState.subscribe(listener2)

        timerState.setLastNosakiRefresh(1000000)

        expect(listener1).toHaveBeenCalledTimes(1)
        expect(listener2).toHaveBeenCalledTimes(1)
      })

      it('should return unsubscribe function', () => {
        const listener = vi.fn()
        const unsubscribe = timerState.subscribe(listener)

        timerState.setLastNosakiRefresh(1000000)
        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()

        timerState.setLastNosakiRefresh(2000000)
        // Should still be 1, not called again
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should handle unsubscribe correctly with multiple listeners', () => {
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        const unsub1 = timerState.subscribe(listener1)
        timerState.subscribe(listener2)

        unsub1()

        timerState.setLastRepairRefresh(3000000)

        expect(listener1).not.toHaveBeenCalled()
        expect(listener2).toHaveBeenCalledTimes(1)
      })
    })

    describe('Independent timers', () => {
      it('should maintain independent Nosaki and Repair timer values', () => {
        timerState.setLastNosakiRefresh(1000000)
        timerState.setLastRepairRefresh(2000000)

        expect(timerState.getLastNosakiRefresh()).toBe(1000000)
        expect(timerState.getLastRepairRefresh()).toBe(2000000)
      })

      it('should clear timers independently', () => {
        timerState.setLastNosakiRefresh(1000000)
        timerState.setLastRepairRefresh(2000000)

        timerState.clearNosakiTimer()

        expect(timerState.getLastNosakiRefresh()).toBe(0)
        expect(timerState.getLastRepairRefresh()).toBe(2000000)
      })
    })
  })
})
