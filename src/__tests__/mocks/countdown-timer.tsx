import React from 'react'

interface CountdownNotifierLabelProps {
  timerKey: string
  completeTime: number
  getLabelStyle: (props: unknown, timeRemaining: number) => string
  getNotifyOptions: () => unknown
}

export const CountdownTimerInner: React.FC<{
  countdownId: string
  startTime?: number
  tickCallback?: (timeElapsed: number) => void
  startCallback?: () => void
}> = ({ countdownId }) => <span data-testid={`countdown-timer-${countdownId}`}>Timer</span>

export const CountdownNotifierLabel: React.FC<CountdownNotifierLabelProps> = ({
  timerKey,
  completeTime,
}) => (
  <span data-testid="countdown-label">
    Timer:{timerKey}:{completeTime}
  </span>
)
