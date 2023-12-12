import 'dotenv/config'
import { createServer } from 'node:http2'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { FetchError } from 'ofetch'
import pkg from '../package.json'
import { ApiError } from './utils/errorResponse'
import api from './routes'

const app = new Hono()

if (!process.env.SECRET) throw new Error('No Secret Environtment!')
if (!process.env.AUTH_SECRET) throw new Error('No Auth Secret Environtment!')
if (!process.env.SHOWROOM_API) throw new Error('Showroom API not provided!')

app.get('/', c => c.json({
  author: 'crstlnz',
  website: 'https://dc.crstlnz.site',
  version: `${pkg.version}`,
}))

app.route('/api', api)

app.notFound((c) => {
  return c.json({
    status: 404,
    message: 'Endpoint not found!',
    path: c.req.path,
  }, 404)
})

app.onError((err, c) => {
  console.error(err.stack)
  const path = c.req.path
  if (err instanceof ApiError) {
    const errJson = err.toJSON()
    return c.json({
      ...errJson,
      path,
    }, errJson.status || 500)
  }
  else if (err instanceof FetchError) {
    return c.json({
      status: (err as FetchError).status,
      message: (err as FetchError).message,
      path,
    }, (err as FetchError).status || 500)
  }

  return c.json({
    status: 500,
    message: 'An error occurred!',
    path,
  }, 500)
})

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT || 3000),
})
