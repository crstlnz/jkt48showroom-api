import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ONE_MONTH } from '@/const'

export function getRefreshToken(c: Context) {
  return getCookie(c, '_refresh_token')
}

export function setRefreshToken(c: Context, token: string) {
  setCookie(c, '_refresh_token', token, { path: '/', maxAge: ONE_MONTH })
}

export function deleteRefreshToken(c: Context) {
  console.log('REFRESH TOKEN DELETED')
  deleteCookie(c, '_refresh_token', { path: '/' })
}

export const refreshTokenTime = 2630000 // 1 month
