import type { Context } from 'hono'
import { createFactory } from 'hono/factory'
import { useCache } from './useCache'

const factory = createFactory()

export const createMiddleware = factory.createMiddleware
export const createHandlers = factory.createHandlers

export function handler(fetch: (c: Context) => Promise<any>, cache?: Utils.DurationUnits) {
  return createHandlers(useCache(cache ?? { seconds: 0 }), async (c) => {
    return c.json(await fetch(c) as any)
  })
}
