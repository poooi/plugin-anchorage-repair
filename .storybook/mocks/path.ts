export const join = (...parts: string[]): string =>
  parts.filter(Boolean).join('/').replace(/\/+/g, '/')

export const dirname = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const index = normalizedPath.lastIndexOf('/')
  return index >= 0 ? normalizedPath.slice(0, index) : '.'
}
