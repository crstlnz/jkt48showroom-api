import type { Context } from 'hono'
import { createFactory } from 'hono/factory'
import { useCache } from './useCache'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

export function handler(fetch: (c: Context) => Promise<any>, opts?: ((c: Context) => CacheOptions | Utils.DurationUnits) | CacheOptions | Utils.DurationUnits) {
  return createHandlers(useCache(opts), async (c) => {
    return c.json(await fetch(c) as any)
  })
}
