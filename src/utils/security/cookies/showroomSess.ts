import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export function getShowroomSess(c: Context) {
  return getCookie(c, '_sr_sess')
}

export function setShowroomSess(c: Context, token: string) {
  setCookie(c, '_sr_sess', token, { path: '/' })
}

export function deleteShowroomSess(c: Context) {
  deleteCookie(c, '_sr_sess', { path: '/' })
}
