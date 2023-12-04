import { ofetch } from 'ofetch'
import type { Context } from 'hono'
import { parseCookieString } from '@/utils'
import RefreshToken from '@/database/schema/auth/RefreshToken'
import { createError } from '@/utils/errorResponse'
import { clearToken, createToken } from '@/utils/security/token'
import { getRefreshToken } from '@/utils/security/cookies/refreshToken'

export async function login(c: Context) {
  const loginData = await c.req.parseBody()
  const body = new URLSearchParams()

  body.append('account_id', loginData.account_id || '')
  body.append('password', loginData.password || '')

  const sr_sess: ShowroomLogin.Session | null = c.get('showroom_session')
  if (sr_sess?.csrf_token) body.append('csrf_token', sr_sess?.csrf_token)

  if (loginData.captcha_word) body.append('captcha_word', loginData.captcha_word)
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

  if (data?.error) return c.json(data, 401)
  if (!sr_id) throw new Error('Token not provided!')
  if ((data as ShowroomLogin.Data)?.ok === 1) {
    const userData = data as ShowroomLogin.Data
    const { sessionData } = await createToken(c, String(userData.user_id), sr_id)
    return c.json({
      id: sessionData.id,
      name: sessionData.name,
      account_id: sessionData.account_id,
    })
  }

  clearToken(c)
  return c.json({ error: 'Please refresh and try again!' }, 401)
}

export async function logout(c: Context) {
  try {
    const sess = c.get('showroom_session')
    const body = new URLSearchParams()
    body.append('csrf_token', sess.csrf_token || '')
    const res = await ofetch(`${process.env.SHOWROOM_API}/user/logout_api`, {
      headers: {
        'Cookie': `sr_id=${sess.sr_id};`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
      body: body.toString(),
      onResponseError(ctx) {
        console.log(ctx.response._data)
      },
    })

    const refreshToken = getRefreshToken(c)
    if (refreshToken) {
      await RefreshToken.deleteMany({ token: refreshToken })
    }

    clearToken(c)
    return c.json({ success: true })
  }
  catch (e) {
    console.log(e)
    throw createError({ status: 401, message: 'Unauthorized!' })
  }
}
