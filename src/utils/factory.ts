import type { Context } from 'hono'
import { createFactory } from 'hono/factory'

// import { cache } from 'hono/cache'
import dayjs from 'dayjs'
import defu from 'defu'
import { useCache } from './useCache'
import { useRateLimitSingleProcess } from './useSingleProcess'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

export interface CacheOptions extends Utils.DurationUnits {
  name?: string
  useRateLimit?: boolean
  useSingleProcess?: boolean
  useJson?: boolean
}

const defaultConfig = {
  useSingleProcess: true,
  useRateLimit: false,
}

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions) | CacheOptions) {
  return createHandlers(createMiddleware(async (c, next) => {
    const config = defu(typeof opts === 'function' ? opts(c) : opts ?? {}, defaultConfig)
    c.set('useRateLimit', config.useRateLimit)
    c.set('useSingleProcess', config.useSingleProcess)
    c.set('useJson', config.useJson)

    const ms = dayjs.duration(config ?? {}).asSeconds()
    if (ms !== 0 && process.env.NODE_ENV !== 'development') c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), useRateLimitSingleProcess(fetch))
}
