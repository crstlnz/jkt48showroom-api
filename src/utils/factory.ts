import type { Context } from 'hono'
// import { cache } from 'hono/cache'
import dayjs from 'dayjs'

import defu from 'defu'
import { createFactory } from 'hono/factory'
import { ApiError, unauthorized } from './errorResponse'
import { isJWTValid } from './security/jwt'
import { isTooManyRequest } from './security/rateLimitter'
import { sign } from './security/signature'
import { getDurationObject, useCache } from './useCache'
import { useRateLimitSingleProcess } from './useSingleProcess'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

export interface CacheOptions extends Utils.DurationUnits {
  name?: string
  useRateLimit?: boolean
  useSingleProcess?: boolean
  useJson?: boolean
  cacheClientOnly?: boolean
  checkApiKey?: boolean
  checkSignature?: boolean
  devCache?: boolean
  rateLimit?: { // rate limit by ip
    maxRequest: number
    limitTimeWindow: number
  }
}

const defaultConfig = {
  useSingleProcess: true,
  useRateLimit: false,
  useJson: true,
  cacheClientOnly: false,
  checkApiKey: false,
  devCache: false,
  checkSignature: false,
}

async function delayInvalidApiKey() {
  await new Promise(resolve => setTimeout(resolve, 15_000))
}

function isValidApiKeyToken(token?: string | null) {
  if (!token) return false
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) return false
  return isJWTValid(token, jwtSecret)
}

const nonceMap = new Set()

function getAllowedOrigins() {
  return (process.env.SECONDARY_ORIGINS ?? '')
    .split(',')
    .map(i => i.trim())
    .filter(Boolean)
}

function getRequestOrigin(c: Context) {
  const origin = c.req.header('origin')
  if (origin) return origin

  const referer = c.req.header('referer')
  if (!referer) return null

  try {
    return new URL(referer).origin
  }
  catch {
    return null
  }
}

function canBypassSignature(c: Context) {
  const origin = getRequestOrigin(c)
  return !!origin && getAllowedOrigins().includes(origin)
}

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions) | CacheOptions) {
  return createHandlers(createMiddleware(async (c, next) => {
    const config = defu(typeof opts === 'function' ? opts(c) : opts ?? {}, defaultConfig)
    c.set('useRateLimit' as never, config.useRateLimit as never)
    c.set('useSingleProcess' as never, config.useSingleProcess as never)
    c.set('useJson' as never, config.useJson as never)
    c.set('cacheClientOnly' as never, config.cacheClientOnly as never)
    c.set('devCache' as never, config.devCache as never)
    const ms = dayjs.duration(getDurationObject(config ?? {})).asSeconds()

    if (config.checkApiKey) {
      const incomingApiKey = c.req.header('x-api-key') || c.req.query('api_key')
      if (!isValidApiKeyToken(incomingApiKey)) {
        if (process.env.NODE_ENV !== 'development') await delayInvalidApiKey()
      }
    }

    if (config.checkSignature && !canBypassSignature(c)) {
      const signature = c.req.header('x-signature')
      const nonce = c.req.header('x-nonce')
      if (nonceMap.has(nonce)) throw unauthorized()
      const s = await sign(nonce)
      if (signature !== s) {
        throw unauthorized()
      }
      nonceMap.add(nonce)
      setTimeout(() => {
        nonceMap.delete(nonce)
      }, 600000)
    }

    if (config.rateLimit && isTooManyRequest(c, config.rateLimit.maxRequest, config.rateLimit.limitTimeWindow)) {
      throw new ApiError({ message: 'Too many request!', status: 409 })
    }

    if (process.env.NODE_ENV === 'development' && !config.devCache) return await next()
    if (ms === 0) return await next()
    c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), useRateLimitSingleProcess(fetch))
}
