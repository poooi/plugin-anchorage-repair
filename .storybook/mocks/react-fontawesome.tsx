import React from 'react'

const FontAwesome: React.FC<{ name: string }> = ({ name }) => (
  <span aria-hidden="true">{name}</span>
)

export default FontAwesome
