import React from 'react'

import { resolveTime } from './tools'

export const CountdownNotifierLabel: React.FC<{
  completeTime: number
  timerKey: string
}> = () => <span>{resolveTime(0)}</span>
