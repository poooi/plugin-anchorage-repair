export const resolveTime = (seconds: number): string => {
  if (seconds < 0) return '--:--'

  const normalized = Math.floor(seconds)
  const hours = Math.floor(normalized / 3600)
  const minutes = Math.floor((normalized % 3600) / 60)
  const remainingSeconds = normalized % 60
  const parts = [minutes, remainingSeconds].map((part) =>
    part.toString().padStart(2, '0'),
  )

  return hours > 0 ? `${hours}:${parts.join(':')}` : parts.join(':')
}
