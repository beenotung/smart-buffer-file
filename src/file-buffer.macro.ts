function gen() {
  const type_sizes = {
    'Int8': 1,
    'Int16BE': 2,
    'Int16LE': 2,
    'Int32BE': 4,
    'Int32LE': 4,
    'BigInt64BE': 8,
    'BigInt64LE': 8,
    'UInt8': 1,
    'UInt16BE': 2,
    'UInt16LE': 2,
    'UInt32BE': 4,
    'UInt32LE': 4,
    'BigUInt64BE': 8,
    'BigUInt64LE': 8,
    'FloatBE': 4,
    'FloatLE': 4,
    'DoubleBE': 8,
    'DoubleLE': 8,
  }
  return `
import fs from 'fs'
import { ensureEnoughRead, ensureEnoughWrite, expandArguments, writeBufferNT } from './utils'

export class FileBuffer {
  writeOffset = 0
  readOffset = 0

  writePromise = Promise.resolve()

  constructor(public fd: fs.promises.FileHandle) {
  }

  sync() {
    return this.fd.sync()
  }

  datasync() {
    return this.fd.datasync()
  }

  close() {
    return this.fd.close()
  }

  rewind(offset: number) {
    this.writeOffset = this.readOffset = offset
    return this
  }

  reset() {
    return this.rewind(0)
  }

  clear() {
    this.writePromise = this.writePromise.then(() => this.fd.truncate(0))
    this.rewind(0)
    return this
  }

  get length(): number {
    return fs.fstatSync(this.fd.fd).size
  }

  async getLength(): Promise<number> {
    const stat = await this.fd.stat()
    return stat.size
  }

  /**
   * Gets the remaining data left to be read from the FileBuffer instance.
   */
  async getRemaining(): Promise<number> {
    const length = await this.getLength()
    return length - this.readOffset
  }

  toBuffer(): Buffer {
    return fs.readFileSync(this.fd.fd)
  }

  toString(encoding?: BufferEncoding): string {
    return this.toBuffer().toString(encoding)
  }

  async readBuffer(byteSize: number, offset?: number): Promise<Buffer> {
    const buffer = Buffer.alloc(byteSize)
    if (typeof offset === 'number') {
      const result = await this.fd.read(buffer, 0, byteSize, offset)
      ensureEnoughRead(result.bytesRead, byteSize)
      return buffer
    } else {
      offset = this.readOffset
      this.readOffset += byteSize
      const result = await this.fd.read(buffer, 0, byteSize, offset)
      ensureEnoughRead(result.bytesRead, byteSize)
      return buffer
    }
  }

  queueWrite(value: Buffer, offset: number) {
    const byteSize = value.length
    this.writePromise = this.writePromise.then(async () => {
      const result = await this.fd.write(value, 0, byteSize, offset)
      ensureEnoughWrite(result.bytesWritten, byteSize)
    })
  }

  writeBuffer(value: Buffer, offset?: number): this {
    const byteSize = value.length
    if (typeof offset === 'number') {
      this.queueWrite(value, offset)
      this.writeOffset = Math.max(this.writeOffset, offset + byteSize)
    } else {
      this.queueWrite(value, this.writeOffset)
      this.writeOffset += byteSize
    }
    return this
  }

  async readString(length: number, offset?: number): Promise<string>
  async readString(length: number, encoding?: BufferEncoding, offset?: number): Promise<string>
  async readString(length: number, arg2?: BufferEncoding | number, offset?: number): Promise<string> {
    const encoding = typeof arg2 === 'string' ? arg2 : undefined
    offset = typeof arg2 === 'number' ? arg2 : offset
    const buffer = await this.readBuffer(length, offset)
    return buffer.toString(encoding)
  }

  writeString(value: string, offset?: number): this
  writeString(value: string, encoding?: BufferEncoding, offset?: number): this
  writeString(value: string, arg2?: BufferEncoding | number, offset?: number): this {
    const encoding = typeof arg2 === 'string' ? arg2 : undefined
    offset = typeof arg2 === 'number' ? arg2 : offset
    const buffer = Buffer.from(value, encoding)
    return this.writeBuffer(buffer, offset)
  }

  async readBufferNT(offset?: number): Promise<Buffer> {
    const length = await this.getLength()
    const readBuffer = Buffer.alloc(1)
    const start = typeof offset === 'number' ? offset : this.readOffset
    let nullPos = length
    const resultBuffer: number[] = []
    for (let i = this.readOffset; i < length; i++) {
      const result = await this.fd.read(readBuffer, 0, 1, start + i)
      ensureEnoughRead(result.bytesRead, 1)
      const byte = readBuffer[0]
      if (byte === 0x00) {
        nullPos = start + 1
        break
      }
      resultBuffer.push(byte)
    }
    if (typeof offset !== 'number') {
      this.readOffset = nullPos + 1
    }
    return Buffer.from(resultBuffer)
  }

  writeBufferNT(value: Buffer, offset?: number): this {
    writeBufferNT(this, value, offset)
    return this
  }

  async readStringNT(offset?: number): Promise<string>
  async readStringNT(encoding?: BufferEncoding, offset?: number): Promise<string>
  async readStringNT(offset?: number, encoding?: BufferEncoding): Promise<string>
  async readStringNT(): Promise<string> {
    const args = expandArguments(arguments, 0)
    const buffer = await this.readBufferNT(args.offset)
    return buffer.toString(args.encoding)
  }

  writeStringNT(value: string, offset?: number): this
  writeStringNT(value: string, encoding?: BufferEncoding, offset?: number): this
  writeStringNT(value: string, offset?: number, encoding?: BufferEncoding): this
  writeStringNT(value: string): this {
    const args = expandArguments(arguments, 1)
    const buffer = Buffer.from(value, args.encoding)
    return this.writeBufferNT(buffer, args.offset)
  }

  ${Object.entries(type_sizes).map(([type, size]) => {
    const value = type.startsWith('Big') ? 'bigint' : 'number'
    return `
  async read${type}(offset?: number): Promise<${value}> {
    const buffer = await this.readBuffer(${size}, offset)
    return buffer.read${type}(0)
  }

  write${type}(value: ${value}, offset?: number): this {
    const buffer = Buffer.alloc(${size})
    buffer.write${type}(value, 0)
    return this.writeBuffer(buffer, offset)
  }
  `
  }).join('').trim()}

  static async fromFile(file: string, flags = 'w+') {
    const fd = await fs.promises.open(file, flags)
    return new FileBuffer(fd)
  }
}
`.trim()
}

gen()
