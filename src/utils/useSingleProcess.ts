import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import useRateLimit from './useRateLimit'
import { createError } from './errorResponse'

const processes = new Map<string, Promise<any>>()
export async function useSingleProcess<T>(id: string, process: () => Promise<T>): Promise<T> {
  let promise = processes.get(id)
  console.log(id, promise)
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
    }

    const rateLimitFetch = async () => {
      const limit = useRateLimit()
      if (limit.limited) throw createError({ statusCode: 429, statusMessage: 'Rate limit!' })
      const data = await fetch(c)
      if (limit && !limit.limited) limit?.clear()
      return data
    }

    const fetchData = async () => {
      if (config.useRateLimit) {
        return await rateLimitFetch()
      }
      return await fetch(c)
    }

    if (config.useSingleProcess) {
      return c.json(await useSingleProcess(c.req.url, fetchData))
    }
    else {
      return await fetchData()
    }
  })
}
