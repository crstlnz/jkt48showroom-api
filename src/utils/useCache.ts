import type { Context } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { JSONValue } from 'hono/utils/types'
import type { CacheOptions } from './factory'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import { createMiddleware } from 'hono/factory'
import cache from './cache'

dayjs.extend(duration)

const dayjsDurationUnits = ['milliseconds', 'seconds', 'minutes', 'hours', 'days', 'months', 'years', 'weeks']
export function getDurationObject(opts: CacheOptions) {
  const duration = {} as Record<string, number>
  for (const key of Object.keys(opts)) {
    if (dayjsDurationUnits.includes(key)) duration[key] = opts[key as keyof CacheOptions] as number
  }
  return duration
}

const bodyCache = new Map<string, any>()

export function useCache(cacheOpts?: ((c: Context) => CacheOptions) | CacheOptions) {
  return createMiddleware(async (c, next) => {
    if (process.env.NODE_ENV === 'development') return await next()
    if (c.get('cacheClientOnly')) return await next()
    const cc = cacheOpts ?? { seconds: 0 }
    const opts = typeof cc === 'function' ? cc(c) : cc
    const cacheName = opts.name ?? c.req.url
    let ms = dayjs.duration(getDurationObject(opts)).asMilliseconds()
    if (Number.isNaN(ms)) ms = 0
    if (ms === 0) return await next()
    const useJson = c.get('useJson')
    const res = useJson ? await cache.get(cacheName) : bodyCache.get(cacheName)
    if (res) {
      if (useJson) {
        return c.json(res)
      }
      else {
        const headers = res.headers
        for (const header of headers) {
          c.header(header.key, header.value)
        }
        console.log(headers)
        return c.body(res.data)
      }
    }
    else {
      if (useJson) {
        const oldJson = c.json
        const newJson = (object: JSONValue, status?: StatusCode | undefined, headers?: any | undefined) => {
          if (status === undefined || status === 200) {
            cache.set(cacheName, object as object, ms)
          }
          return oldJson(object as any, status, headers)
        }
        c.json = newJson as any
      }
      else {
        const oldBody = c.body
        const newBody = (data: any | null, status?: StatusCode | undefined, headers?: any | undefined) => {
          if (status === undefined || status === 200) {
            let headerArray = []
            try {
              headerArray = JSON.parse(c.get('custom_headers')) ?? []
              for (const header of headerArray) {
                c.header(header.key, header.value)
              }
            }
            catch (e) {
              console.log(e)
            }
            bodyCache.set(cacheName, {
              headers: headerArray,
              data,
            })
          }
          return oldBody(data, status, headers)
        }
        c.body = newBody as any
      }
      await next()
    }
  })
}
