import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import useRateLimit from './useRateLimit'
import { createError } from './errorResponse'

const processes = new Map<string, Promise<any>>()
export async function useSingleProcess<T>(id: string, process: () => Promise<T>): Promise<T> {
  let promise = processes.get(id)
  if (promise) {
    return await promise
  }
  else {
    promise = process()
    processes.set(id, promise)
    promise.then(() => {
      processes.delete(id)
    }).catch(() => {
      processes.delete(id)
    })
    return promise
  }
}

export function useRateLimitSingleProcess(fetch: (c: Context) => any) {
  return createMiddleware(async (c: Context) => {
    const config = {
      useRateLimit: c.get('useRateLimit'),
      useSingleProcess: c.get('useSingleProcess'),
      useJson: c.get('useJson') ?? true,
    }

    const rateLimitFetch = async () => {
      const limit = useRateLimit()
      if (limit.limited) throw createError({ statusCode: 429, statusMessage: 'Rate limit!' })
      try {
        const data = await fetch(c)
        limit.clear()
        return data
      }
      catch (e) {
        console.error(e)
        limit.clear()
        throw e
      }
    }

    const fetchData = async () => {
      if (config.useRateLimit) {
        return await rateLimitFetch()
      }
      return await fetch(c)
    }

    if (config.useSingleProcess) {
      if (config.useJson) {
        return c.json(await useSingleProcess(c.req.url, fetchData))
      }
      else {
        return c.body(await useSingleProcess(c.req.url, fetchData))
      }
    }
    else {
      if (config.useJson) {
        return c.json(await fetchData())
      }
      else {
        return c.body(await fetchData())
      }
    }
  })
}
