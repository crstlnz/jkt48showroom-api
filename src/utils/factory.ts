import type { Context } from 'hono'
// import { cache } from 'hono/cache'
import dayjs from 'dayjs'

import defu from 'defu'
import { createFactory } from 'hono/factory'
import { ApiError } from './errorResponse'
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
}

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions) | CacheOptions) {
  return createHandlers(createMiddleware(async (c, next) => {
    const config = defu(typeof opts === 'function' ? opts(c) : opts ?? {}, defaultConfig)
    // @ts-expect-error error type
    c.set('useRateLimit', config.useRateLimit)
    // @ts-expect-error error type
    c.set('useSingleProcess', config.useSingleProcess)
    // @ts-expect-error error type
    c.set('useJson', config.useJson)
    // @ts-expect-error error type
    c.set('cacheClientOnly', config.cacheClientOnly)
    const ms = dayjs.duration(getDurationObject(config ?? {})).asSeconds()

    if (config.rateLimit && isTooManyRequest(c, config.rateLimit.maxRequest, config.rateLimit.limitTimeWindow)) {
      throw new ApiError({ message: 'Too many request!', status: 409 })
    }

    if (process.env.NODE_ENV === 'development') return await next()
    if (ms === 0) return await next()
    c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), useRateLimitSingleProcess(fetch))
}
