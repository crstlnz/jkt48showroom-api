import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { ONE_MONTH } from '@/const'

const name = '_rt'
const isDev = process.env.NODE_ENV === 'development'
const cookieSettings: CookieOptions = {
  secure: !isDev,
  httpOnly: true,
  // domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
  sameSite: isDev ? undefined : 'None',
}

const HEADER_NAME = 'X-Refresh-Token'

export function getRefreshToken(c: Context) {
  const refreshToken = c.req.header(HEADER_NAME)
  if (!refreshToken) {
    return null
  }
  return refreshToken
}

export function setRefreshToken(c: Context, token: string) {
  c.header(HEADER_NAME, token)
}

export function deleteRefreshToken(c: Context) {
  c.header(HEADER_NAME, '')
}

export const refreshTokenTime = ONE_MONTH // 1 month
