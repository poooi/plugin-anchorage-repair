export const mkdir = async () => undefined

export const readFile = async () => {
  throw new Error('Mock file does not exist')
}

export const writeFile = async () => undefined
