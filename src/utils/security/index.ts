import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import { createMiddleware } from 'hono/factory'
import { getSessId, setSessId } from './cookies/sessId'

function generateIV(): Buffer {
  return crypto.randomBytes(16)
}

const algorithm = 'aes-256-cbc'
export function encrypt(text: string): string {
  console.log('wew')
  const iv = generateIV()
  const key = Buffer.from(process.env.SECRET!)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
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

export function isAdmin(userId: string | number) {
  const ids = (process.env.ADMIN_IDS || '').split(',')
  return ids.includes(String(userId))
}

export function checkAdmin() {
  return createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!isAdmin(user.id)) return await c.notFound()
    return next()
  })
}
