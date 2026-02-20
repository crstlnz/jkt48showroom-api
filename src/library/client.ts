import type { Context } from 'hono'

export async function getClientInfo(c: Context) {
  const userAgent = c.req.header('user-agent') ?? ''
  const xRequestedWith = (c.req.header('x-requested-with') ?? '').trim().toLowerCase()
  c.header('Cache-Control', 'no-store')
  return {
    is_embedded: xRequestedWith !== '',
    user_agent: userAgent,
    x_requested_with: xRequestedWith,
  }
}
