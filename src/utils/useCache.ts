import { createMiddleware } from 'hono/factory'
import type { JSONValue } from 'hono/utils/types'
import cache from './cache'

interface CacheOptions {
  name?: string
  ms?: number
}

export function useCache(opts?: CacheOptions | number) {
  return createMiddleware(async (c, next) => {
    // if (process.env.NODE_ENV === 'development') return await next()
    /* `await cache.clear()` is clearing the cache before processing the request. */
    // await cache.clear()
    const ms = Number.isNaN(opts) ? (opts as CacheOptions)?.ms || 3600000 : opts as number
    const cacheName = (Number.isNaN(opts) ? (opts as CacheOptions)?.name : null) || c.req.url
    const res = await cache.get(cacheName)
    if (res) {
      return c.json(res)
    }
    else {
      const oldJson = c.json
      c.json = (object: JSONValue, status?: number | undefined, headers?: any | undefined): Response => {
        cache.set(cacheName, object as object, ms)
        return oldJson(object, status, headers)
      }
      await next()
    }
  })
}
