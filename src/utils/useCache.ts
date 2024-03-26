import { createMiddleware } from 'hono/factory'
import type { JSONValue } from 'hono/utils/types'
import duration from 'dayjs/plugin/duration'
import dayjs from 'dayjs'
import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import cache from './cache'

dayjs.extend(duration)

export function useCache(cacheOpts?: ((c: Context) => CacheOptions | Utils.DurationUnits) | CacheOptions | Utils.DurationUnits) {
  return createMiddleware(async (c, next) => {
    if (process.env.NODE_ENV === 'development') return await next()
    const cc = cacheOpts ?? { seconds: 0 }

    const opts = typeof cc === 'function' ? cc(c) : cc
    let cacheName = c.req.url
    let ms = 0
    if (opts && 'duration' in opts) {
      const durationUnits = (opts as CacheOptions)?.duration
      ms = durationUnits ? dayjs.duration(durationUnits).asMilliseconds() : 0
      if (ms === 0) return await next()
      cacheName = (opts as CacheOptions)?.name || c.req.url
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
      const newJson = (object: JSONValue, status?: StatusCode | undefined, headers?: any | undefined) => {
        if (status === undefined || status === 200) {
          cache.set(cacheName, object as object, ms)
        }
        return oldJson(object as any, status, headers)
      }
      c.json = newJson as any
      await next()
    }
  })
}
