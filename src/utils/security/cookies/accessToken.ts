import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { CookieOptions } from 'hono/utils/cookie'
import { ONE_MONTH } from '@/const'

const name = '_st'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
  path: '/',
}

export function getAccessToken(c: Context) {
  return getCookie(c, name)
}

export function setAccessToken(c: Context, token: string) {
  setCookie(c, name, token, {
    ...cookieSettings,
    maxAge: ONE_MONTH,
  })
}

export function deleteAccessToken(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}
export const accessTokenTime = 3600 // 1 hour
