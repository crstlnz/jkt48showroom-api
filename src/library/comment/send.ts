import { sendComment as commentAPI } from '@utils/showroomAPI'
import type { Context } from 'hono'
import { createError } from '@/utils/errorResponse'

// Watch.CommentResponse
export async function sendComment(c: Context): Promise<Response> {
  const body = await c.req.parseBody()
  const srSess = c.get('showroom_session')
  const user = c.get('user')

  if (!srSess || !user?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated!' })
  if (!srSess.csrf_token || !body.comment || !body.live_id) throw createError({ statusCode: 400, statusMessage: 'Bad request!' })
  const params = new URLSearchParams()
  params.append('csrf_token', srSess.csrf_token || body.csrf_token || '')
  params.append('comment', body.comment)
  params.append('live_id', body.live_id)
  params.append('is_delay', body.is_delay)
  return c.json(await commentAPI({
    headers: {
      'Cookie': `sr_id=${srSess.sr_id}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  }).catch((e) => {
    if (e.data?.errors?.length && e.data.errors[0].code === 1005) {
      throw createError({ statusCode: 400, statusMessage: 'SMS not authenticated!' })
    }
    throw createError({ statusCode: 500, statusMessage: 'An error occured!' })
  }))
}
