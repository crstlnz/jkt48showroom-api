import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { sign, verify } from 'hono/jwt'
import { ofetch } from 'ofetch'
import { getShowroomSess, setShowroomSess } from './security/cookies/showroomSess'
import { parseCookieString } from '.'

export async function createShowroomSession(c: Context): Promise<ShowroomLogin.Session> {
  const user = c.get('user')
  let sr_id = user?.sr_id
  const res = await ofetch(`${process.env.SHOWROOM_API}/api/csrf_token`, {
    headers: {
      Cookie: sr_id ? `sr_id=${sr_id};` : '',
    },
    onResponse({ response }) {
      if (!sr_id) {
        const cookies = parseCookieString(response.headers.get('Set-Cookie') || '')
        if (cookies.sr_id?.value) { sr_id = cookies.sr_id?.value }
      }
    },
  })
  const csrf_token = res.csrf_token
  return {
    sr_id,
    csrf_token,
  }
}

export function useShowroomSession() {
  return createMiddleware(async (c, next) => {
    let sess = await verify(getShowroomSess(c) || '', process.env.SECRET!).catch(_ => null)

    if ((!sess?.sr_id || !sess?.csrf_token) && !c.get('showroom_session')) {
      sess = await createShowroomSession(c).catch(_ => null)
      const sessToken = await sign(sess, process.env.SECRET!)
      setShowroomSess(c, sessToken)
    }

    c.set('showroom_session', sess)
    await next()
  })
}
