import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

type CorsLevel = 'self' | 'all'
export function useCORS(level: CorsLevel) {
  const origin: string[] = []
  if (process.env.ORIGINS) {
    origin.push(...process.env.ORIGINS.split(','))
  }

  const corsOptions = {
    allowMethods: ['POST', 'GET', 'DELETE', 'PUT'],
    credentials: true,
  }

  if (level === 'self') {
    return cors({
      origin,
      ...corsOptions,
    })
  }
  else {
    return cors({
      origin: ['*', ...origin],
      ...corsOptions,
    })
  }
}
