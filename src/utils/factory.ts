import type { Context } from 'hono'
import { createFactory } from 'hono/factory'

// import { cache } from 'hono/cache'
import dayjs from 'dayjs'
import { useCache } from './useCache'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions | Utils.DurationUnits) | CacheOptions | Utils.DurationUnits) {
  return createHandlers(createMiddleware(async (c, next) => {
    const config = typeof opts === 'function' ? opts(c) : opts
    let ms
    if (config && 'duration' in config) {
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
    return c.json(await fetch(c) as any)
  })
}
