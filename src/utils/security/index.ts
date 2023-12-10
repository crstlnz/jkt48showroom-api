import crypto from 'crypto'
import { Buffer } from 'buffer'
import dayjs from 'dayjs'
import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { decode, verify } from 'hono/jwt'
import { createError } from '../errorResponse'
import { deleteAccessToken, getAccessToken } from './cookies/accessToken'
import { deleteRefreshToken, getRefreshToken } from './cookies/refreshToken'
import { getSessId, setSessId } from './cookies/sessId'
import { getRefreshedToken } from './token'

function generateIV(): Buffer {
  return crypto.randomBytes(16)
}

const algorithm = 'aes-256-cbc'
export function encrypt(text: string): string {
  const iv = generateIV()
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(process.env.SECRET!), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encrypted: string) {
  try {
    const textParts = encrypted.split(':') as any[]
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(process.env.SECRET!), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  }
  catch (e) {
    return null
  }
}

export function hashWithSecret(data: any, secretKey: string) {
  return crypto.createHmac('md5', secretKey).update(data).digest('hex')
}

export function generateUUID() {
  return crypto.randomUUID()
}

export function generateCSRF(c: Context) {
  const userAgent = c.req.header('user-agent')
  const sessIdCookie = getSessId(c)
  const token = getAccessToken(c)
  const decodedToken = token ? decode(token) : null
  const sessId = sessIdCookie || generateUUID()
  if (sessIdCookie == null) {
    setSessId(c, sessId)
  }
  const data = `${userAgent}-${sessId}-${dayjs().startOf('day').toISOString()}${decodedToken?.payload?.sr_id ? `-${decodedToken.payload.sr_id}` : ''}`
  return hashWithSecret(data, process.env.SECRET || '')
}

export function useSessionID() {
  return createMiddleware((c, next) => {
    const sessIdCookie = getSessId(c)
    const sessId = sessIdCookie || generateUUID()
    c.set('sid', sessId)
    if (sessIdCookie == null) {
      setSessId(c, sessId)
    }
    return next()
  })
}
