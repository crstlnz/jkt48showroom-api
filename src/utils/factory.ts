import type { Context } from 'hono'
import { createFactory } from 'hono/factory'

// import { cache } from 'hono/cache'
import dayjs from 'dayjs'
import { useCache } from './useCache'
import { createError } from './errorResponse'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

const rateLimit = new Set()
const maxConcurrentProcess = 30

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions | Utils.DurationUnits) | CacheOptions | Utils.DurationUnits, useRateLimit?: boolean) {
  return createHandlers(createMiddleware(async (c, next) => {
    const config = typeof opts === 'function' ? opts(c) : opts
    c.set('useRateLimit', useRateLimit ?? false)
    let ms
    if (config && 'duration' in config) {
      if (!useRateLimit) {
        c.set('useRateLimit', config?.useRateLimit ?? false)
      }
      const durationUnits = (config as CacheOptions)?.duration
      ms = durationUnits ? dayjs.duration(durationUnits).asSeconds() : 0
    }
    else if (opts) {
      ms = dayjs.duration(opts as Utils.DurationUnits).asSeconds()
    }

    if (ms === 0) return await next()
    c.header('Cache-Control', `max-age=${ms}, must-revalidate`)
    return await next()
  }), useCache(opts), async (c) => {
    let uuid
    const useRateLimit = c.get('useRateLimit')
    if (useRateLimit) {
      uuid = crypto.randomUUID()
      if (rateLimit.size > maxConcurrentProcess) {
        throw createError({ statusCode: 429, statusMessage: 'Rate limit!' })
      }
      rateLimit.add(uuid)
    }
    try {
      const data = await fetch(c)
      if (useRateLimit) rateLimit.delete(uuid)
      return c.json(data)
    }
    catch (e) {
      if (useRateLimit) rateLimit.delete(uuid)
      throw e
    }
  })
}
