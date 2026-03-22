import type { Context } from 'hono'
// import type { CookieOptions } from 'hono/utils/cookie'

// const name = '_sr'
// const isDev = process.env.NODE_ENV === 'development'
// const cookieSettings: CookieOptions = {
//   secure: !isDev,
//   httpOnly: true,
//   // domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
//   sameSite: isDev ? undefined : 'None',
// }
export const showroomTokenTime = 1800
const HEADER_NAME = 'X-SR-Token'
export function getShowroomSess(c: Context) {
  const refreshToken = c.req.header(HEADER_NAME)
  if (!refreshToken) {
    return null
  }
  return refreshToken
}

export function setShowroomSess(c: Context, token: string) {
  c.header(HEADER_NAME, token)
}

export function deleteShowroomSess(c: Context) {
  c.header(HEADER_NAME, '')
}
