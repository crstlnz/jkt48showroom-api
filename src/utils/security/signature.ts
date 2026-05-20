import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

const encoder = new TextEncoder()
let signatureSecret: string | null = null
let sourceSignatureSecrets: Map<string, string> | null = null
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

export function getSourceSignatureSecrets(): Map<string, string> {
  if (sourceSignatureSecrets == null) {
    sourceSignatureSecrets = new Map(
      (process.env.SIGNATURE_SECRETS ?? '')
        .split(',')
        .map((item) => {
          const separatorIndex = item.indexOf(':')
          if (separatorIndex === -1) return null

          const source = item.slice(0, separatorIndex).trim()
          const secret = item.slice(separatorIndex + 1).trim()
          if (!source || !secret) return null

          return [source, secret] as const
        })
        .filter((item): item is readonly [string, string] => item != null),
    )
  }
  return sourceSignatureSecrets
}

export function getSignatureSecretBySource(source?: string | null): string | null {
  if (!source) return getSignatureSecret()
  return getSourceSignatureSecrets().get(source) ?? null
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

export function isEqualSignature(value: string, expected: string) {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  return valueBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(valueBuffer, expectedBuffer)
}

export async function verifySignature(bodyRequest: unknown, signature: string, source?: string | null) {
  const secret = getSignatureSecretBySource(source)
  if (!secret) return false

  const expectedSignature = await sign(bodyRequest, secret)
  return isEqualSignature(signature, expectedSignature)
}
