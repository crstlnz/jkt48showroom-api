import { createMiddleware } from 'hono/factory'
import type { JSONValue } from 'hono/utils/types'
import duration from 'dayjs/plugin/duration'
import dayjs from 'dayjs'
import cache from './cache'

dayjs.extend(duration)
interface CacheOptions {
  name?: string
  duration?: Utils.DurationUnits
}

export function useCache(opts?: CacheOptions | Utils.DurationUnits) {
  return createMiddleware(async (c, next) => {
    let cacheName = c.req.url
    let ms = 0
    if (opts && 'duration' in opts) {
      const durationUnits = (opts as CacheOptions)?.duration
      ms = durationUnits ? dayjs.duration(durationUnits).asMilliseconds() : 0
      if (ms === 0) return await next()
      cacheName = (Number.isNaN(opts) ? (opts as CacheOptions)?.name : null) || c.req.url
    }
    else if (opts) {
      ms = dayjs.duration(opts as Utils.DurationUnits).asMilliseconds()
    }

    if (ms === 0) return await next()
    const res = await cache.get(cacheName)
    if (res) {
      return c.json(res)
    }
    else {
      const oldJson = c.json
      c.json = (object: JSONValue, status?: number | undefined, headers?: any | undefined) => {
        cache.set(cacheName, object as object, ms)
        return oldJson(object as any, status, headers)
      }
      await next()
    }
  })
}
