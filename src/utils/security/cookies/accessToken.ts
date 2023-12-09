import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ONE_MONTH } from '@/const'

export function getAccessToken(c: Context) {
  return getCookie(c, '_sess_token')
}

export function setAccessToken(c: Context, token: string) {
  setCookie(c, '_sess_token', token, {
    path: '/',
    maxAge: ONE_MONTH,
  })
}

export function deleteAccessToken(c: Context) {
  console.log('ACCESS TOKEN DELETED')
  deleteCookie(c, '_sess_token', { path: '/' })
}
export const accessTokenTime = 500000 // TODO 1 hour
