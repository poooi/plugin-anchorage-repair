import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export default class FileWriter {
  private writing = false

  private queue: Array<[string, unknown]> = []

  write(filePath: string, data: unknown) {
    this.queue.push([filePath, data])
    void this.continueWriting()
  }

  private async continueWriting() {
    if (this.writing) {
      return
    }

    this.writing = true
    try {
      while (this.queue.length > 0) {
        const [filePath, data] = this.queue.shift()!
        try {
          await mkdir(dirname(filePath), { recursive: true })
          await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
        } catch (error: unknown) {
          console.error(error)
        }
      }
    } finally {
      this.writing = false
    }
  }
}
