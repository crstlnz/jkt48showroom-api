import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const name = '_sid'
export function getSessId(c: Context) {
  return c.get('sid') || getCookie(c, name)
}

export function setSessId(c: Context, token: string) {
  setCookie(c, name, token, { path: '/' })
}

export function deleteSessId(c: Context) {
  deleteCookie(c, name, { path: '/' })
}
