// similar to CountdownTimer in 'views/components/main/parts/countdown-timer.es', but it counts up

import React, { useState, useEffect, useRef } from 'react'

import { resolveTime } from 'views/utils/tools'

interface Ticker {
  reg: (id: string, callback: (currentTime: number) => void) => void
  unreg: (id: string) => void
}

declare global {
  interface Window {
    ticker: Ticker
  }
}

interface CountupTimerProps {
  countdownId: string
  startTime?: number
  tickCallback?: (timeElapsed: number) => void
  startCallback?: () => void
}

const getTimeElapsed = (
  startTime: number,
  currentTime: number = Date.now(),
): number => {
  if (startTime <= 0) {
    return -1
  } else if (startTime > currentTime) {
    return 0
  }
  return Math.round((currentTime - startTime) / 1000)
}

const CountupTimer: React.FC<CountupTimerProps> = ({
  countdownId,
  startTime = -1,
  tickCallback,
  startCallback,
}) => {
  const [displayTime, setDisplayTime] = useState(getTimeElapsed(startTime))
  const containerRef = useRef<HTMLSpanElement>(null)
  const isVisibleRef = useRef(true)
  const startCallbackFiredRef = useRef(false)

  // Set up Intersection Observer to track visibility
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver((entries) => {
      isVisibleRef.current = entries[0].isIntersecting
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Handle ticker registration and prop changes
  useEffect(() => {
    const tick = (currentTime: number) => {
      const timeElapsed = getTimeElapsed(startTime, currentTime)

      if (timeElapsed < 0) {
        window.ticker.unreg(countdownId)
        return
      }

      if (startTime >= 0) {
        try {
          if (isVisibleRef.current) {
            setDisplayTime(timeElapsed)
          }

          if (tickCallback) {
            tickCallback(timeElapsed)
          }

          if (
            timeElapsed < 1 &&
            startCallback &&
            !startCallbackFiredRef.current
          ) {
            startCallback()
            startCallbackFiredRef.current = true
          }
        } catch (error) {
          console.error(error.stack)
        }
      }
    }

    window.ticker.reg(countdownId, tick)
    setDisplayTime(getTimeElapsed(startTime))
    startCallbackFiredRef.current = false

    return () => {
      window.ticker.unreg(countdownId)
    }
  }, [countdownId, startTime, tickCallback, startCallback])

  return <span ref={containerRef}>{resolveTime(displayTime)}</span>
}

export default CountupTimer
