import { Buffer } from 'buffer'
import { Readable } from 'stream'
import { createId } from '@paralleldrive/cuid2'
import cloudinary from 'cloudinary'
import defu from 'defu'
import { R2 } from 'node-cloudflare-r2'
import sharp from 'sharp'
import config from '@/config'

const r2 = new R2({
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
})

export const bucket = r2.bucket(process.env.R2_BUCKET!)
export const imgCDN = 'https://img.crstlnz.my.id'

async function bufferToStream(
  buffer: Buffer | Uint8Array | ArrayBuffer | Blob,
): Promise<Readable | Buffer | Uint8Array> {
  if (buffer instanceof ArrayBuffer) {
    return Readable.from(Buffer.from(buffer))
  }
  if (buffer instanceof Blob) {
    return await blobToUint8Array(buffer)
  }

  return buffer
}

async function toBuffer(
  data: Readable | Buffer | Uint8Array,
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data
  }

  if (data instanceof Uint8Array) {
    return Buffer.from(data)
  }

  if (data instanceof Readable) {
    const chunks: Buffer[] = []

    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }

    return Buffer.concat(chunks as any)
  }

  throw new Error('Unsupported type')
}

export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export async function streamToUint8Array(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    totalLength += value.byteLength
  }

  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}

export function uploadImage(image: string, configs?: cloudinary.UploadApiOptions): Promise<cloudinary.UploadApiResponse> {
  return new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
    const defaultCofnig: cloudinary.UploadApiOptions = { folder: config.uploadFolder }
    const combinedConfigs = defu(configs, defaultCofnig)
    cloudinary.v2.uploader.upload(
      image,
      {
        ...combinedConfigs,
      },
      (error: any, result: any) => {
        if (error) {
          return reject(error)
        }
        else {
          return resolve(result)
        }
      },
    )
  })
}

export interface ImageUploadResponse {
  public_id: string
  version: string
  signature: string
  width: number
  height: number
  format: string
  resource_type: 'image' | 'video' | 'raw' | 'auto'
  created_at: string
  tags: Array<string>
  pages: number
  bytes: number
  type: string
  etag: string
  placeholder: boolean
  url: string
  secure_url: string
  access_mode: string
  original_filename: string
  moderation: Array<string>
  access_control: Array<string>
  context: object // won't change since it's response, we need to discuss documentation team about it before implementing.
  metadata: object // won't change since it's response, we need to discuss documentation team about it before implementing.
  colors?: [string, number][]

  [futureKey: string]: any
}

export async function uploadImageBuffer(image: Buffer | ArrayBuffer, mimeType = 'image/jpeg'): Promise<ImageUploadResponse> {
  const id = createId()
  const buffer = await bufferToStream(image)
  const format = 'webp'
  const sharpImg = sharp(await toBuffer(buffer))
    .toFormat(format)

  const { data: formatted, info } = await sharpImg.toBuffer({ resolveWithObject: true })

  const key = `uploads/${id}.webp`
  const uploadContent = await bucket.uploadStream(formatted, `images/${key}`, undefined, mimeType)
  const now = new Date()

  return {
    public_id: id,
    version: uploadContent.versionId ?? '',
    signature: uploadContent.objectKey ?? '',
    width: info.width!,
    height: info.height!,
    format: info.format!,
    resource_type: 'image',
    created_at: now.toISOString(),
    tags: [],
    pages: info.pages ?? 1,
    bytes: info.size!,
    type: 'upload',
    etag: uploadContent.etag ?? '',
    placeholder: false,
    url: `${imgCDN}/${key}`,
    secure_url: `${imgCDN}/${key}`,
    access_mode: 'public',
    original_filename: id,
    moderation: [],
    access_control: [],
    context: {},
    metadata: {},
  }
}
