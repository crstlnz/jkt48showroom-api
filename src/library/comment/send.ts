import type { Context } from 'hono'
import { sendComment as commentAPI } from '@/utils/api/showroom'
import { createError } from '@/utils/errorResponse'

// Watch.CommentResponse
const cooldown = new Set()
const request = new Set()
const CD_TIME = !Number.isNaN(Number(process.env.COMMENT_COOLDOWN)) ? Number(process.env.COMMENT_COOLDOWN) : 2000
const MAX_REQUEST = !Number.isNaN(Number(process.env.COMMENT_MAX_REQUEST)) ? Number(process.env.COMMENT_MAX_REQUEST) : 10
export async function sendComment(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const srSess = c.get('showroom_session')
  const user = c.get('user')

  if (!srSess || !user?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  if (!srSess.csrf_token || !body.comment || !body.live_id) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  if (cooldown.has(user.id)) throw createError({ status: 429, message: 'Too many request!' })
  if (request.size >= MAX_REQUEST) throw createError({ status: 503, message: 'Server is busy!' })

  // generate uuid for request limit request at same time
  const uuid = crypto.randomUUID()
  request.add(uuid)
  // user comment cooldown
  cooldown.add(user.id)
  setTimeout(() => {
    cooldown.delete(user.id)
  }, CD_TIME)

  const params = new URLSearchParams()
  params.append('csrf_token', srSess.csrf_token || body.csrf_token || '')
  params.append('comment', String(body.comment))
  params.append('live_id', String(body.live_id))
  params.append('is_delay', String(body.is_delay))
  const res = await commentAPI({
    headers: {
      'Cookie': `sr_id=${srSess.sr_id}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  }).catch((e) => {
    request.delete(uuid)
    if (e.data?.errors?.length) {
      console.error(e.response)
      throw createError({ statusCode: e?.response?.status ?? 400, statusMessage: e?.data?.error ?? 'An error occured' })
    }
    throw createError({ statusCode: 500, statusMessage: 'An error occured!' })
  })
  request.delete(uuid)
  return c.json(res)
}
