import React from 'react'

interface FontAwesomeProps {
  name: string
  className?: string
  style?: React.CSSProperties
}

const FontAwesome: React.FC<FontAwesomeProps> = ({ name }) => (
  <span data-testid="fa-icon">{name}</span>
)

export default FontAwesome
