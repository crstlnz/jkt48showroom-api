import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const name = '_sid'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  path: '/',
  secure: !isDev,
  // domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
}
export function getSessId(c: Context) {
  return c.get('sid') || getCookie(c, name)
}

export function setSessId(c: Context, token: string) {
  setCookie(c, name, token, {
    ...cookieSettings,
  })
}

export function deleteSessId(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}
