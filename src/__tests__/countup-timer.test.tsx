import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import CountupTimer from '../countup-timer'

// Get the mock ticker from setup
interface MockTicker {
  callbacks: Map<string, (currentTime: number) => void>
  reg: (id: string, callback: (currentTime: number) => void) => void
  unreg: (id: string) => void
  tick: (currentTime?: number) => void
}

const getMockTicker = (): MockTicker =>
  window.ticker as unknown as MockTicker

describe('countup-timer.tsx', () => {
  beforeEach(() => {
    getMockTicker().callbacks.clear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('CountupTimer', () => {
    it('should render with initial display time', () => {
      const now = Date.now()
      render(
        <CountupTimer countdownId="test-timer" startTime={now - 60000} />,
      )

      // 60 seconds elapsed, should show 00:01:00
      expect(screen.getByText('00:01:00')).toBeInTheDocument()
    })

    it('should display --:--:-- when startTime is 0 or negative', () => {
      render(<CountupTimer countdownId="test-timer" startTime={0} />)

      expect(screen.getByText('--:--:--')).toBeInTheDocument()
    })

    it('should display 00:00:00 when startTime is in the future', () => {
      const future = Date.now() + 60000
      render(<CountupTimer countdownId="test-timer" startTime={future} />)

      expect(screen.getByText('00:00:00')).toBeInTheDocument()
    })

    it('should register with ticker on mount', () => {
      render(<CountupTimer countdownId="test-timer-1" startTime={Date.now()} />)

      expect(getMockTicker().callbacks.has('test-timer-1')).toBe(true)
    })

    it('should unregister from ticker on unmount', () => {
      const { unmount } = render(
        <CountupTimer countdownId="test-timer-2" startTime={Date.now()} />,
      )

      expect(getMockTicker().callbacks.has('test-timer-2')).toBe(true)

      unmount()

      expect(getMockTicker().callbacks.has('test-timer-2')).toBe(false)
    })

    it('should call tickCallback with elapsed time', () => {
      const tickCallback = vi.fn()
      const startTime = Date.now() - 30000 // 30 seconds ago

      render(
        <CountupTimer
          countdownId="test-timer-3"
          startTime={startTime}
          tickCallback={tickCallback}
        />,
      )

      // Simulate ticker tick
      act(() => {
        getMockTicker().tick(Date.now())
      })

      expect(tickCallback).toHaveBeenCalled()
      expect(tickCallback).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should call startCallback when timeElapsed < 1', () => {
      const startCallback = vi.fn()
      const startTime = Date.now() // Just started

      render(
        <CountupTimer
          countdownId="test-timer-4"
          startTime={startTime}
          startCallback={startCallback}
        />,
      )

      // Simulate ticker tick with current time (just started)
      act(() => {
        getMockTicker().tick(Date.now())
      })

      expect(startCallback).toHaveBeenCalledTimes(1)
    })

    it('should only call startCallback once', () => {
      const startCallback = vi.fn()
      const startTime = Date.now()

      render(
        <CountupTimer
          countdownId="test-timer-5"
          startTime={startTime}
          startCallback={startCallback}
        />,
      )

      // Simulate multiple ticks at start
      act(() => {
        getMockTicker().tick(startTime)
        getMockTicker().tick(startTime + 100)
        getMockTicker().tick(startTime + 200)
      })

      expect(startCallback).toHaveBeenCalledTimes(1)
    })

    it('should unregister when timeElapsed is negative', () => {
      const startTime = 0 // Invalid start time

      render(<CountupTimer countdownId="test-timer-6" startTime={startTime} />)

      // Simulate tick
      act(() => {
        getMockTicker().tick(Date.now())
      })

      // Timer should unregister itself when time is negative
      expect(getMockTicker().callbacks.has('test-timer-6')).toBe(false)
    })

    it('should update display time on tick when visible', () => {
      const startTime = Date.now() - 60000

      render(<CountupTimer countdownId="test-timer-7" startTime={startTime} />)

      // Initial display
      expect(screen.getByText('00:01:00')).toBeInTheDocument()

      // Simulate tick 30 seconds later
      act(() => {
        getMockTicker().tick(Date.now() + 30000)
      })

      // Should update to 90 seconds
      expect(screen.getByText('00:01:30')).toBeInTheDocument()
    })

    it('should use default startTime of -1', () => {
      render(<CountupTimer countdownId="test-timer-default" />)

      expect(screen.getByText('--:--:--')).toBeInTheDocument()
    })

    it('should handle ticker callback errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
        // Suppress console.error during test
      })
      const throwingCallback = vi.fn(() => {
        throw new Error('Test error')
      })

      render(
        <CountupTimer
          countdownId="test-timer-error"
          startTime={Date.now()}
          tickCallback={throwingCallback}
        />,
      )

      // Should not throw when tick occurs
      expect(() => {
        act(() => {
          getMockTicker().tick(Date.now())
        })
      }).not.toThrow()

      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
