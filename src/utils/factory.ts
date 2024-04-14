import type { Context } from 'hono'
import { createFactory } from 'hono/factory'

// import { cache } from 'hono/cache'
import dayjs from 'dayjs'
import defu from 'defu'
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
    c.set('useRateLimit', config.useRateLimit)
    c.set('useSingleProcess', config.useSingleProcess)
    c.set('useJson', config.useJson)
    c.set('cacheClientOnly', config.cacheClientOnly)
    const ms = dayjs.duration(getDurationObject(config ?? {})).asSeconds()
    if (ms !== 0 && process.env.NODE_ENV !== 'development') c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), useRateLimitSingleProcess(fetch))
}
