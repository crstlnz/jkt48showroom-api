import { cors } from 'hono/cors'

interface CORSOptions {
  allowMethods?: string[]
  allowHeaders?: string[]
  maxAge?: number
  credentials?: boolean
  exposeHeaders?: string[]
}

type CorsLevel = 'self' | 'all'
const origins = process.env.ORIGINS ? process.env.ORIGINS.split(',') : []
export function useCORS(level: CorsLevel) {
  const origin: string[] = []
  if (process.env.ORIGINS) {
    origin.push(...process.env.ORIGINS.split(','))
  }

  const corsOptions: CORSOptions = {
    allowMethods: ['POST', 'GET', 'DELETE', 'PUT'],
    credentials: true,
  }

  if (level === 'self') {
    return cors({
      origin: (origin) => {
        return origins.some(i => i.endsWith(origin)) ? origin : process.env.DEFAULT_ORIGIN
      },
      ...corsOptions,
    })
  }
  else {
    return cors({
      origin: (origin) => {
        return origins.some(i => i.endsWith(origin)) ? origin : '*'
      },
      ...corsOptions,
    })
  }
}
