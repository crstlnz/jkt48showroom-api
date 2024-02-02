import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { CookieOptions } from 'hono/utils/cookie'
import { ONE_MONTH } from '@/const'

const name = '_rt'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  httpOnly: true,
  domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
  path: '/',
}

export function getRefreshToken(c: Context) {
  return getCookie(c, name)
}

export function setRefreshToken(c: Context, token: string) {
  setCookie(c, name, token, {
    ...cookieSettings,
    maxAge: ONE_MONTH,
  })
}

export function deleteRefreshToken(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}

export const refreshTokenTime = ONE_MONTH // 1 month
