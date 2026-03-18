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

export function getRefreshToken(c: Context) {
  const refreshToken = c.req.header('X-Refresh-Token')
  if (!refreshToken) {
    return null
  }
  return refreshToken
}

export function setRefreshToken(c: Context, token: string) {
  c.header('X-Refresh-Token', token)
}

// export function deleteRefreshToken(c: Context) {
//   deleteCookie(c, name, { ...cookieSettings })
// }

export const refreshTokenTime = ONE_MONTH // 1 month
