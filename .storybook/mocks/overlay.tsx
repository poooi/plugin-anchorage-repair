import React from 'react'

export const Tooltip: React.FC<{
  children: React.ReactNode
  content: React.ReactNode
  placement?: string
}> = ({ children }) => <>{children}</>
