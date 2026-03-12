import { cors } from 'hono/cors'

interface CORSOptions {
  allowMethods?: string[]
  allowHeaders?: string[]
  maxAge?: number
  credentials?: boolean
  exposeHeaders?: string[]
}

type CorsLevel = 'self' | 'all'

const allowedOrigins = process.env.ORIGINS ? process.env.ORIGINS.split(',').map(o => o.trim()) : []
const defaultOrigin = process.env.DEFAULT_ORIGIN ?? ''

function isAllowed(requestOrigin: string): boolean {
  return allowedOrigins.includes(requestOrigin)
    || requestOrigin.startsWith('http://localhost')
}

export function useCORS(level: CorsLevel) {
  const corsOptions: CORSOptions = {
    allowMethods: ['POST', 'GET', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
  }

  if (level === 'self') {
    return cors({
      ...corsOptions,
      credentials: true,
      origin: (requestOrigin) => {
        return isAllowed(requestOrigin) ? requestOrigin : defaultOrigin
      },
    })
  }
  else {
    return cors({
      ...corsOptions,
      credentials: false,
      origin: (requestOrigin) => {
        return requestOrigin || defaultOrigin
      },
    })
  }
}
