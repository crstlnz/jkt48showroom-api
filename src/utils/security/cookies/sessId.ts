import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export function getSessId(c: Context) {
  return getCookie(c, '_sess_id')
}

export function setSessId(c: Context, token: string) {
  setCookie(c, '_sess_id', token, { path: '/' })
}

export function deleteSessId(c: Context) {
  deleteCookie(c, '_sess_id', { path: '/' })
}
