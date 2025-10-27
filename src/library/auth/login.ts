import type { Context } from 'hono'
import type { ShowroomLogin } from '@/types/auth'
import { ofetch } from 'ofetch'
import { parseCookieString } from '@/utils'
import { createError } from '@/utils/errorResponse'
import { createHandlers } from '@/utils/factory'
import { deleteSessId } from '@/utils/security/cookies/sessId'
import { deleteShowroomSess } from '@/utils/security/cookies/showroomSess'
import { clearToken, createToken } from '@/utils/security/token'
import { getShowroomSession } from '@/utils/showroomSession'

export function login() {
  return createHandlers(async (c) => {
    const loginData = await c.req.parseBody()
    const body = new URLSearchParams()

    body.append('account_id', String(loginData.account_id || ''))
    body.append('password', String(loginData.password || ''))

    const sr_sess: ShowroomLogin.Session | null = c.get('showroom_session')
    if (sr_sess?.csrf_token) body.append('csrf_token', sr_sess?.csrf_token)

    if (loginData.captcha_word) body.append('captcha_word', String(loginData.captcha_word))

    let sr_id = sr_sess?.sr_id
    const data = await ofetch<ShowroomLogin.Data | ShowroomLogin.Error>('https://www.showroom-live.com/user/login', {
      method: 'POST',
      headers: {
        'Cookie': sr_id ? `sr_id=${sr_id}` : '',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      async onResponse({ response }) {
        const cookies = parseCookieString(response.headers.get('Set-Cookie') || '')
        sr_id = cookies.sr_id?.value
      },
    }).catch(e => e.data)

    if (data?.error) {
      clearToken(c)
      deleteSessId(c)
      if (data?.error === 'Already logged in.') {
        deleteShowroomSess(c)
      }
      return c.json(data, 401)
    }

    if (sr_id && (data as ShowroomLogin.Data)?.ok === 1) {
      deleteShowroomSess(c)
      const userData = data as ShowroomLogin.Data
      const { sessionData } = await createToken(c, String(userData.user_id), sr_id)
      return c.json({
        id: sessionData.id,
        name: sessionData.name,
        account_id: sessionData.account_id,
      })
    }

    clearToken(c)
    deleteShowroomSess(c)
    deleteSessId(c)
    return c.json({ error: 'Please refresh and try again!' }, 401)
  })
}

export async function logoutHandler(c: Context, sr_id?: string) {
  try {
    const sess = c.get('showroom_session') || (await getShowroomSession(c))?.session
    if (!sess) throw createError({ status: 401, message: 'Unauthorized!' })
    const body = new URLSearchParams()
    body.append('csrf_token', sess.csrf_token || '')
    await ofetch(`${process.env.SHOWROOM_API}/user/logout_api`, {
      headers: {
        'Cookie': `sr_id=${sr_id || sess.sr_id};`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: body.toString(),
    })

    clearToken(c)
    deleteShowroomSess(c)
    deleteSessId(c)
    return c.json({ success: true })
  }
  catch {
    throw createError({ status: 401, message: 'Unauthorized!' })
  }
}

export function logout() {
  return createHandlers(async (c) => {
    return await logoutHandler(c)
  })
}
