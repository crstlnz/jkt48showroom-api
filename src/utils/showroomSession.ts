import type { Context } from 'hono'
import type { ShowroomLogin } from '@/types/auth'
import { createMiddleware } from 'hono/factory'
import { sign, verify } from 'jsonwebtoken'
import { ofetch } from 'ofetch'
import { parseCookieString } from '.'
import { createError } from './errorResponse'
import { getShowroomSess, setShowroomSess } from './security/cookies/showroomSess'
import { getDecodedToken } from './security/token'

function verifyShowroomSessionToken(token?: string): ShowroomLogin.Session | null {
  if (!token) {
    return null
  }

  try {
    const decoded = verify(token, process.env.SECRET!)
    if (!decoded || typeof decoded === 'string') {
      return null
    }
    return decoded as ShowroomLogin.Session
  }
  catch {
    return null
  }
}

export async function createShowroomSession(c: Context): Promise<ShowroomLogin.Session> {
  const user = c.get('user') || getDecodedToken(c)
  let sr_id = user?.sr_id
  const res = await ofetch(`${process.env.SHOWROOM_API}/api/csrf_token`, {
    headers: {
      Cookie: sr_id ? `sr_id=${sr_id};` : '',
    },
    onResponse({ response }) {
      if (!sr_id) {
        const cookies = parseCookieString(response.headers.get('Set-Cookie') || '')
        if (cookies.sr_id?.value) {
          sr_id = cookies.sr_id?.value
        }
      }
    },
  })

  const csrf_token = res.csrf_token
  return {
    sr_id,
    csrf_token,
  }
}

export async function getShowroomSession(c: Context): Promise<{ session: ShowroomLogin.Session, setCookie: boolean }> {
  let sess = verifyShowroomSessionToken(getShowroomSess(c))
  let setCookie = false
  const user = c.get('user')
  if (((!sess?.sr_id || !sess?.csrf_token) && !c.get('showroom_session'))) {
    sess = await createShowroomSession(c).catch(() => null)
    setCookie = true
  }

  const sr_id = sess?.sr_id || c.get('showroom_session')
  if (user?.sr_id && user.sr_id !== sr_id) {
    sess = await createShowroomSession(c).catch(() => null)
    setCookie = true
  }

  if (!sess?.sr_id || !sess?.csrf_token) {
    throw createError({
      status: 503,
      message: 'Failed to initialize showroom session',
    })
  }

  return {
    session: sess,
    setCookie,
  }
}

export function useShowroomSession() {
  return createMiddleware(async (c, next) => {
    const sess = await getShowroomSession(c)
    if (sess.setCookie) {
      const sessToken = sign(sess.session, process.env.SECRET!)
      setShowroomSess(c, sessToken)
    }
    c.set('showroom_session', sess.session)
    await next()
  })
}
