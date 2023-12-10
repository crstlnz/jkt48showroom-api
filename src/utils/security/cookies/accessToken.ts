import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { ONE_MONTH } from '@/const'
import { logout } from '@/library/auth/login'

const name = '_st'
export function getAccessToken(c: Context) {
  return getCookie(c, name)
}

export function setAccessToken(c: Context, token: string) {
  setCookie(c, name, token, {
    path: '/',
    maxAge: ONE_MONTH,
  })
}

export function deleteAccessToken(c: Context) {
  deleteCookie(c, name, { path: '/' })
}
export const accessTokenTime = 3600 // 1 hour