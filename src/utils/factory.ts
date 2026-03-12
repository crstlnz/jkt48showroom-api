import type { Context } from 'hono'
// import { cache } from 'hono/cache'
import dayjs from 'dayjs'

import defu from 'defu'
import { createFactory } from 'hono/factory'
import { ApiError } from './errorResponse'
import { isJWTValid } from './security/jwt'
import { isTooManyRequest } from './security/rateLimitter'
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

    if (config.rateLimit && isTooManyRequest(c, config.rateLimit.maxRequest, config.rateLimit.limitTimeWindow)) {
      throw new ApiError({ message: 'Too many request!', status: 409 })
    }

    if (process.env.NODE_ENV === 'development' && !config.devCache) return await next()
    if (ms === 0) return await next()
    c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), useRateLimitSingleProcess(fetch))
}
