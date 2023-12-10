import type { Context } from 'hono'
import { ofetch } from 'ofetch'
import { createError } from '@/utils/errorResponse'

export async function follow(c: Context) {
  const user = c.get('user')
  const srSess = c.get('showroom_session')
  const body = await c.req.parseBody()
  if (!user || !srSess) throw createError({ status: 401, message: 'Unauthorized!' })
  if (!body.flag || !body.room_id) throw createError({ status: 400, message: 'Bad request!' })
  const data = new URLSearchParams()
  data.append('csrf_token', srSess.csrf_token || '')
  data.append('room_id', body.room_id || '')
  data.append('flag', body.flag || 0)
  await ofetch(`${process.env.SHOWROOM_API}/api/room/follow`, {
    method: 'POST',
    headers: {
      'Cookie': `sr_id=${srSess.sr_id}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: data.toString(),
  })
  return c.json({ ok: true })
}
