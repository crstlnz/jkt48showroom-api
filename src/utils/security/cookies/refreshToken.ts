import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { CookieOptions } from 'hono/utils/cookie'
import { ONE_MONTH } from '@/const'

const name = '_rt'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: 'None',
  path: '/',
}

export function getRefreshToken(c: Context) {
  return getCookie(c, name)
}

export function setRefreshToken(c: Context, token: string) {
  console.log('REFRESH TOKEN SET', name)
  console.log({
    ...cookieSettings,
    maxAge: ONE_MONTH,
  })
  setCookie(c, name, token, {
    ...cookieSettings,
    maxAge: ONE_MONTH,
  })
}

export function deleteRefreshToken(c: Context) {
  deleteCookie(c, name, { ...cookieSettings })
}

export const refreshTokenTime = ONE_MONTH // 1 month
