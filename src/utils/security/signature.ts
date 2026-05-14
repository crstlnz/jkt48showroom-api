import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

const encoder = new TextEncoder()
let signatureSecret: string | null = null
function toHex(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString('hex')
}

export function getSignatureSecret(): string {
  if (signatureSecret == null) {
    signatureSecret = crypto
      .createHmac('sha256', process.env.JWT_SECRET!)
      .update(process.env.SECRET!)
      .digest('hex')
  }
  return signatureSecret
}

export async function sign(bodyRequest: unknown, secretKey: string | null = null) {
  secretKey = secretKey ?? getSignatureSecret()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const body = typeof bodyRequest === 'string' ? bodyRequest : JSON.stringify(bodyRequest)
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(body)))
}
