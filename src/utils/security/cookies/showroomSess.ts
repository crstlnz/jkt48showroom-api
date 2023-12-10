import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const name = '_sr'
export function getShowroomSess(c: Context) {
  return getCookie(c, name)
}

export function setShowroomSess(c: Context, token: string) {
  setCookie(c, name, token, { path: '/' })
}

export function deleteShowroomSess(c: Context) {
  deleteCookie(c, name, { path: '/' })
}
