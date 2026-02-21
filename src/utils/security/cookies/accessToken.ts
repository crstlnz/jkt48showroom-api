import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const name = '_st'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  httpOnly: true,
  // domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
  path: '/',
}

export const accessTokenTime = 3600 * 24 // 24 hour

export function getAccessToken(c: Context) {
  return getCookie(c, name)
}

export function setAccessToken(c: Context, token: string) {
  setCookie(c, name, token, {
    ...cookieSettings,
    maxAge: accessTokenTime,
  })
}

export function deleteAccessToken(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}
