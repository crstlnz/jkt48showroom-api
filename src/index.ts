import { Hono } from 'hono'
import { FetchError } from 'ofetch'
import pkg from '../package.json'
import api from './routes'

import { initLiveData, websocketUpgrade, wsHandler } from './routes/websocket'
import { generateShowroomId } from './utils/api/showroom'
import { ApiError } from './utils/errorResponse'
import { isJWTValid } from './utils/security/jwt'
import webhook from './webhooks'
import 'dotenv/config'

// import { startCron } from './cron'
const app = new Hono()
/// start Cron
// startCron()

if (!process.env.SECRET) throw new Error('No Secret Environtment!')
if (!process.env.AUTH_SECRET) throw new Error('No Auth Secret Environtment!')
if (!process.env.SHOWROOM_API) throw new Error('Showroom API not provided!')

app.get('/', c => c.json({
  author: 'crstlnz',
  website: 'https://dc.crstlnz.my.id',
  version: `${pkg.version}`,
}))

app.route('/api', api)
app.route('/webhook', webhook)

app.notFound((c) => {
  return c.json({
    status: 404,
    message: 'Endpoint not found!',
    path: c.req.path,
  }, 404)
})

app.onError((err, c) => {
  if (process.env.LOG === 'true') {
    console.error(err)
  }
  const path = c.req.path
  if (err instanceof ApiError) {
    const errJson = err.toJSON()
    return c.json({
      ...errJson,
      path,
    }, (errJson.status || 500) as 500)
  }
  else if (err instanceof FetchError) {
    return c.json({
      status: (err as FetchError).status,
      message: (err as FetchError).message,
      path,
    }, (err.status || 500) as 500)
  }

  return c.json({
    status: 500,
    message: 'An error occurred!',
    path,
  }, 500)
})

generateShowroomId().catch(console.error)

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

initLiveData()

export function isWebSocketPath(urlStr: string): boolean {
  // Skip protocol & host jika absolute URL
  // Cari '/' ketiga (setelah "https://example.com")
  let slashCount = 0
  let pathStart = 0

  for (let i = 0; i < urlStr.length; i++) {
    if (urlStr.charCodeAt(i) === 47) { // '/'
      slashCount++
      if (slashCount === 3) {
        pathStart = i
        break
      }
    }
  }

  // Jika tidak absolute (cuma "/ws"), pathStart tetap 0
  if (slashCount < 3) pathStart = 0

  // Fast compare untuk '/ws' atau '/ws?' atau '/ws/' tanpa slice
  const c0 = urlStr.charCodeAt(pathStart) // '/'
  const c1 = urlStr.charCodeAt(pathStart + 1) // 'w'
  const c2 = urlStr.charCodeAt(pathStart + 2) // 's'
  const c3 = urlStr.charCodeAt(pathStart + 3) // mungkin '?', '/', atau end

  return (
    c0 === 47 // '/'
    && c1 === 119 // 'w'
    && c2 === 115 // 's'
    && (
      Number.isNaN(c3) // akhir string
      || c3 === 63 // '?'
      || c3 === 47 // '/ws/'
    )
  )
}

Bun.serve({
  fetch: (...args) => {
    const [req, server] = args
    if (isWebSocketPath(req.url)) {
      let apiKey = null
      const i = req.url.indexOf('token=')
      if (i !== -1) {
        const s = i + 6
        let e = req.url.indexOf('&', s)
        if (e === -1) e = req.url.length
        apiKey = req.url.slice(s, e)
      }
      if (!apiKey || !isJWTValid(apiKey)) throw new ApiError({ status: 401, message: 'Unauthorized!' })
      return websocketUpgrade(req, server)
    }

    return app.fetch(...args)
  },
  websocket: wsHandler,
})
