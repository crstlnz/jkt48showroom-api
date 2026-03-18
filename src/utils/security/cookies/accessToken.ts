import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { deleteCookie } from 'hono/cookie'

const name = '_st'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  httpOnly: true,
  // domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
}

export const accessTokenTime = 3600 * 24 // 24 hour

export function getAccessToken(c: Context) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.replace('Bearer ', '')
}

export function setAccessToken(c: Context, token: string) {
  c.header('X-Access-Token', token)
}

export function deleteAccessToken(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}
