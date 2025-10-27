import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const name = '_sr'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  path: '/',
  secure: !isDev,
  httpOnly: true,
  domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
}
export function getShowroomSess(c: Context) {
  return getCookie(c, name)
}

export function setShowroomSess(c: Context, token: string) {
  setCookie(c, name, token, {
    ...cookieSettings,
  })
}

export function deleteShowroomSess(c: Context) {
  deleteCookie(c, name, {
    ...cookieSettings,
  })
}
