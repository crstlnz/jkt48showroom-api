import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { CookieOptions } from 'hono/utils/cookie'

const name = '_sid'
const cookieSettings: CookieOptions = {
  path: '/',
  secure: true,
  sameSite: 'None',
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
