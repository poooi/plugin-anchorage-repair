export const join = (...parts: string[]): string =>
  parts.filter(Boolean).join('/').replace(/\/+/g, '/')
