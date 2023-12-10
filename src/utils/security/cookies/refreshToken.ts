import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ONE_MONTH } from '@/const'

const name = '_rt'
export function getRefreshToken(c: Context) {
  return getCookie(c, name)
}

export function setRefreshToken(c: Context, token: string) {
  setCookie(c, name, token, { path: '/', maxAge: ONE_MONTH })
}

export function deleteRefreshToken(c: Context) {
  console.log('REFRESH TOKEN DELETED')
  deleteCookie(c, name, { path: '/' })
}

export const refreshTokenTime = 2630000 // 1 month
